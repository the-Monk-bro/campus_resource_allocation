"use server";

import pool from "@/lib/db";
import { UserRow, ResourceRow, ApprovalHierarchyRow, RequestRow } from "@/lib/types/db";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateRequestInput {
  resid: string;
  purpose?: string;
  starttime: string; // ISO or datetime-local string
  endtime: string;   // ISO or datetime-local string
}

export async function createRequestAction(input: CreateRequestInput) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized. Please sign in to continue." };
    }

    // Find the logged-in user in DB
    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, name, email FROM users WHERE email = ? LIMIT 1`,
      [session.user.email]
    );

    const user = userRows[0];
    if (!user) {
      return { success: false, error: "User record not found. Please complete profile onboarding." };
    }

    const { resid, purpose, starttime, endtime } = input;

    // Validate required fields
    if (!resid?.trim()) {
      return { success: false, error: "Resource selection is required." };
    }

    if (!starttime || !endtime) {
      return { success: false, error: "Both start time and end time are required." };
    }

    const startDate = new Date(starttime);
    const endDate = new Date(endtime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: "Invalid date/time format provided." };
    }

    // Check DB constraint: endtime > starttime
    if (endDate <= startDate) {
      return { success: false, error: "End time must be strictly after start time." };
    }

    // Verify resource exists
    const [resRows] = await pool.execute<ResourceRow[]>(
      `SELECT id, name, status FROM resources WHERE id = ? LIMIT 1`,
      [resid.trim()]
    );

    const existingResource = resRows[0];
    if (!existingResource) {
      return { success: false, error: `Selected resource '${resid}' was not found in the database.` };
    }

    // Validate purpose length (max 100 chars per schema)
    const trimmedPurpose = purpose?.trim();
    if (trimmedPurpose && trimmedPurpose.length > 100) {
      return { success: false, error: "Purpose cannot exceed 100 characters." };
    }

    const now = new Date();
    const conn = await pool.getConnection();

    let newRequestId: number;

    try {
      await conn.beginTransaction();

      // Insert request
      const [insertResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO requests (requesterid, resid, purpose, starttime, endtime, reqstatus, reqtime)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
        [user.id, existingResource.id, trimmedPurpose || null, startDate, endDate, now]
      );

      newRequestId = insertResult.insertId;

      // Auto-create all approval steps for this request based on the approval hierarchy
      const [hierarchyRows] = await conn.execute<ApprovalHierarchyRow[]>(
        `SELECT hid, hlevel, approverid, resid FROM approval_hierarchies WHERE resid = ? ORDER BY hlevel ASC`,
        [existingResource.id]
      );

      if (hierarchyRows.length > 0) {
        const placeholders = hierarchyRows.map(() => `(?, ?, ?, 'PENDING', ?)`).join(", ");
        const params: (string | number | Date)[] = [];
        for (const h of hierarchyRows) {
          params.push(h.hid, newRequestId, h.approverid, now);
        }

        await conn.execute(
          `INSERT INTO approval_steps (hid, reqid, approverid, approvalstatus, issuetime) VALUES ${placeholders}`,
          params
        );
      }

      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    revalidatePath("/dashboard/requests");
    return {
      success: true,
      message: "Request submitted successfully!",
      requestId: newRequestId,
    };
  } catch (error: unknown) {
    console.error("Failed to create request:", error);
    const message = error instanceof Error ? error.message : "Failed to submit request due to a server error.";
    return {
      success: false,
      error: message,
    };
  }
}

export interface ApproverInfo {
  hid: string;
  hlevel: number;
  approverId: string;
  approverName: string | null;
  approverEmail: string | null;
  approverRole: string | null;
  approverDepartment: string | null;
}

interface ApproverHierarchyQueryResult extends RowDataPacket {
  hid: string;
  hlevel: number;
  approverId: string;
  approverName: string | null;
  approverEmail: string | null;
  approverRole: string | null;
  approverDepartment: string | null;
}

export async function getApprovalHierarchyAction(
  resid: string
): Promise<{ success: true; approvers: ApproverInfo[] } | { success: false; error: string }> {
  try {
    if (!resid?.trim()) {
      return { success: false, error: "No resource specified." };
    }

    const [rows] = await pool.execute<ApproverHierarchyQueryResult[]>(
      `SELECT
        ah.hid,
        ah.hlevel,
        u.id AS approverId,
        u.name AS approverName,
        u.email AS approverEmail,
        u.role AS approverRole,
        u.department AS approverDepartment
       FROM approval_hierarchies ah
       INNER JOIN users u ON ah.approverid = u.id
       WHERE ah.resid = ?
       ORDER BY ah.hlevel ASC`,
      [resid.trim()]
    );

    return {
      success: true,
      approvers: rows.map((r) => ({
        hid: r.hid,
        hlevel: r.hlevel,
        approverId: r.approverId,
        approverName: r.approverName,
        approverEmail: r.approverEmail,
        approverRole: r.approverRole,
        approverDepartment: r.approverDepartment,
      })),
    };
  } catch (error: unknown) {
    console.error("Failed to fetch approval hierarchy:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch approval hierarchy.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function cancelRequestAction(reqid: number) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized." };
    }

    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [session.user.email]
    );

    const user = userRows[0];
    if (!user) {
      return { success: false, error: "User not found." };
    }

    // Verify the request belongs to this user
    const [reqRows] = await pool.execute<RequestRow[]>(
      `SELECT reqid, requesterid, reqstatus FROM requests WHERE reqid = ? AND requesterid = ? LIMIT 1`,
      [reqid, user.id]
    );

    const existingReq = reqRows[0];
    if (!existingReq) {
      return { success: false, error: "Request not found or not owned by you." };
    }

    if (existingReq.reqstatus !== "PENDING") {
      return { success: false, error: `Cannot cancel a request that is already ${existingReq.reqstatus}.` };
    }

    await pool.execute(
      `UPDATE requests SET reqstatus = 'CANCELLED' WHERE reqid = ?`,
      [reqid]
    );

    revalidatePath("/dashboard/requests");
    return { success: true, message: "Request cancelled successfully." };
  } catch (error: unknown) {
    console.error("Failed to cancel request:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel request.";
    return {
      success: false,
      error: message,
    };
  }
}
