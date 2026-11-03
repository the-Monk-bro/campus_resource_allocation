"use server";

import pool from "@/lib/db";
import { UserRow, ResourceRow, ApprovalHierarchyRow, RequestRow } from "@/lib/types/db";
import { ApproverInfo, UserActiveRoleAssignment } from "@/components/requests/types";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateRequestInput {
  resid: string;
  assignmentId: number;
  purpose?: string;
  starttime: string; // ISO or datetime-local string
  endtime: string;   // ISO or datetime-local string
}

export async function getUserActiveAssignmentsAction(): Promise<
  { success: true; assignments: UserActiveRoleAssignment[] } | { success: false; error: string }
> {
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

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        ra.AssignmentId AS assignmentId,
        ra.RoleId AS roleId,
        r.RoleName AS roleName,
        ra.ScopeId AS scopeId,
        s.ScopeName AS scopeName,
        s.ScopeType AS scopeType
       FROM role_assignments ra
       INNER JOIN roles r ON ra.RoleId = r.RoleId
       INNER JOIN scopes s ON ra.ScopeId = s.ScopeId
       WHERE ra.UserId = ?
         AND ra.ValidFrom <= NOW()
         AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       ORDER BY r.RoleName ASC, s.ScopeName ASC`,
      [user.id]
    );

    return {
      success: true,
      assignments: rows.map((r) => ({
        assignmentId: r.assignmentId,
        roleId: r.roleId,
        roleName: r.roleName,
        scopeId: r.scopeId,
        scopeName: r.scopeName,
        scopeType: r.scopeType,
      })),
    };
  } catch (error: unknown) {
    console.error("Failed to fetch active assignments:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch active assignments.";
    return { success: false, error: message };
  }
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

    const { resid, assignmentId, purpose, starttime, endtime } = input;

    // Validate required fields
    if (!resid?.trim()) {
      return { success: false, error: "Resource selection is required." };
    }

    if (!assignmentId) {
      return { success: false, error: "Please select the role assignment under which you are requesting." };
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

    // Verify user owns the specified assignment and it is currently active
    const [assignRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ra.AssignmentId, r.RoleName, s.ScopeName
       FROM role_assignments ra
       INNER JOIN roles r ON ra.RoleId = r.RoleId
       INNER JOIN scopes s ON ra.ScopeId = s.ScopeId
       WHERE ra.AssignmentId = ? AND ra.UserId = ?
         AND ra.ValidFrom <= NOW()
         AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       LIMIT 1`,
      [assignmentId, user.id]
    );

    if (!assignRows || assignRows.length === 0) {
      return {
        success: false,
        error: "The selected role assignment is invalid, expired, or does not belong to you.",
      };
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

      // Insert request with RequesterAssignmentId
      const [insertResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO requests (requesterid, RequesterAssignmentId, resid, purpose, starttime, endtime, reqstatus, reqtime)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [user.id, assignmentId, existingResource.id, trimmedPurpose || null, startDate, endDate, now]
      );

      newRequestId = insertResult.insertId;

      // Auto-create all approval steps for this request based on the approval hierarchy
      const [hierarchyRows] = await conn.execute<ApprovalHierarchyRow[]>(
        `SELECT hid, hlevel, resid, RoleId, ScopeId
         FROM approval_hierarchies
         WHERE resid = ?
         ORDER BY hlevel ASC`,
        [existingResource.id]
      );

      if (hierarchyRows.length > 0) {
        for (const h of hierarchyRows) {
          // Resolve currently active approver for (RoleId, ScopeId)
          const [approverRows] = await conn.execute<RowDataPacket[]>(
            `SELECT ra.UserId
             FROM role_assignments ra
             WHERE ra.RoleId = ? AND ra.ScopeId = ?
               AND ra.ValidFrom <= NOW()
               AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
             ORDER BY ra.ValidFrom ASC
             LIMIT 1`,
            [h.RoleId, h.ScopeId]
          );

          if (!approverRows || approverRows.length === 0) {
            throw new Error(
              `Cannot submit request: No active approver currently holds the required role assignment (Level ${h.hlevel}).`
            );
          }

          const assignedApproverId = approverRows[0].UserId;

          await conn.execute(
            `INSERT INTO approval_steps (hid, reqid, approverid, approvalstatus, issuetime)
             VALUES (?, ?, ?, 'PENDING', ?)`,
            [h.hid, newRequestId, assignedApproverId, now]
          );
        }
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

interface ApproverHierarchyQueryResult extends RowDataPacket {
  hid: string;
  hlevel: number;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  scopeType: string;
  currentApproverName: string | null;
  currentApproverEmail: string | null;
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
        r.RoleId AS roleId,
        r.RoleName AS roleName,
        s.ScopeId AS scopeId,
        s.ScopeName AS scopeName,
        s.ScopeType AS scopeType,
        u.name AS currentApproverName,
        u.email AS currentApproverEmail
       FROM approval_hierarchies ah
       INNER JOIN roles r ON ah.RoleId = r.RoleId
       INNER JOIN scopes s ON ah.ScopeId = s.ScopeId
       LEFT JOIN role_assignments ra ON ra.RoleId = ah.RoleId
         AND ra.ScopeId = ah.ScopeId
         AND ra.ValidFrom <= NOW()
         AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       LEFT JOIN users u ON ra.UserId = u.id
       WHERE ah.resid = ?
       ORDER BY ah.hlevel ASC`,
      [resid.trim()]
    );

    return {
      success: true,
      approvers: rows.map((r) => ({
        hid: r.hid,
        hlevel: r.hlevel,
        roleId: r.roleId,
        roleName: r.roleName,
        scopeId: r.scopeId,
        scopeName: r.scopeName,
        scopeType: r.scopeType,
        currentApproverName: r.currentApproverName,
        currentApproverEmail: r.currentApproverEmail,
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
