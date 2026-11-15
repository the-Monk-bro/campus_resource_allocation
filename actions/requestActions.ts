"use server";

import pool from "@/lib/db";
import { UserRow } from "@/lib/types/db";
import { ApproverInfo, UserActiveRoleAssignment } from "@/components/requests/types";
import { RowDataPacket } from "mysql2/promise";
import type { PoolConnection } from "mysql2/promise";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateRequestInput {
  resid: string;
  assignmentId: number;
  purpose?: string;
  starttime: string;
  endtime: string;
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

type ProcedureResult = {
  newReqId: number | null;
  statusCode: string;
  statusMessage: string;
};

interface ProcedureOutputRow extends RowDataPacket {
  newReqId: number | null;
  statusCode: string | null;
  statusMessage: string | null;
}

const retryableCodes = new Set(["DEADLOCK", "LOCK_TIMEOUT"]);

const procedureErrors: Record<string, string> = {
  INVALID_TIME: "End time must be strictly after start time.",
  INVALID_ASSIGNMENT: "The selected role assignment is invalid, expired, or does not belong to you.",
  NOT_FOUND: "The resource or request was not found.",
  UNAVAILABLE: "The selected resource is currently unavailable.",
  CONFLICT: "The resource is already booked or has a pending request in that time window.",
  NO_HIERARCHY: "No approval hierarchy is configured for this resource.",
  NO_APPROVER: "An approval level has no active approver assigned.",
  INCOMPLETE_STEPS: "Could not create all approval steps. Nothing was saved.",
  FORBIDDEN: "Only the requester can cancel this request.",
  NOT_CANCELLABLE: "Only pending requests can be cancelled.",
  DEADLOCK: "The database is busy. Please try again.",
  LOCK_TIMEOUT: "The database is busy. Please try again.",
  ERROR: "Database operation failed.",
};

async function callRequestProcedure(
  conn: PoolConnection,
  sql: string,
  params: Array<string | number | Date | null>
): Promise<ProcedureResult> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await conn.query("SET @new_reqid = NULL, @status_code = NULL, @status_msg = NULL");
    await conn.query(sql, params);
    const [rows] = await conn.query<ProcedureOutputRow[]>(
      "SELECT @new_reqid AS newReqId, @status_code AS statusCode, @status_msg AS statusMessage"
    );
    const row = rows[0];
    const result: ProcedureResult = {
      newReqId: row?.newReqId == null ? null : Number(row.newReqId),
      statusCode: row?.statusCode ?? "ERROR",
      statusMessage: row?.statusMessage ?? "",
    };

    if (retryableCodes.has(result.statusCode) && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      continue;
    }
    return result;
  }
  throw new Error("Request procedure failed after retries.");
}

export async function createRequestAction(input: CreateRequestInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized. Please sign in to continue." };
    }

    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, name, email FROM users WHERE email = ? LIMIT 1`,
      [session.user.email]
    );
    const user = userRows[0];
    if (!user) {
      return { success: false, error: "User record not found. Please sign in again." };
    }

    const { resid, assignmentId, purpose, starttime, endtime } = input;
    if (!resid?.trim()) {
      return { success: false, error: "Resource selection is required." };
    }
    if (!Number.isInteger(Number(assignmentId)) || Number(assignmentId) <= 0) {
      return { success: false, error: "Please select the role assignment under which you are requesting." };
    }
    if (!starttime || !endtime) {
      return { success: false, error: "Both start time and end time are required." };
    }

    const startDate = new Date(starttime);
    const endDate = new Date(endtime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { success: false, error: "Invalid date/time format provided." };
    }
    if (endDate <= startDate) {
      return { success: false, error: "End time must be strictly after start time." };
    }

    // Validate purpose length (max 100 chars per schema)
    const trimmedPurpose = purpose?.trim();
    if (trimmedPurpose && trimmedPurpose.length > 100) {
      return { success: false, error: "Purpose cannot exceed 100 characters." };
    }

    const conn = await pool.getConnection();
    try {
      const result = await callRequestProcedure(
        conn,
        "CALL sp_create_resource_request(?, ?, ?, ?, ?, ?, @new_reqid, @status_code, @status_msg)",
        [user.id, Number(assignmentId), resid.trim(), trimmedPurpose || null, startDate, endDate]
      );
      if (result.statusCode !== "SUCCESS") {
        if (result.statusCode === "ERROR") console.error("Create request procedure:", result.statusMessage);
        return { success: false, error: procedureErrors[result.statusCode] ?? "Failed to submit request." };
      }

      revalidatePath("/dashboard/requests");
      revalidatePath("/dashboard/approvals");
      return {
        success: true,
        message: "Request submitted successfully!",
        requestId: result.newReqId,
      };
    } finally {
      conn.release();
    }
  } catch (error: unknown) {
    console.error("Failed to create request:", error);
    const message = error instanceof Error ? error.message : "Failed to submit request due to a server error.";
    return { success: false, error: message };
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
}

export async function getApprovalHierarchyAction(
  resid: string
): Promise<{ success: true; approvers: ApproverInfo[] } | { success: false; error: string }> {
  try {
    if (!resid?.trim()) {
      return { success: false, error: "No resource specified." };
    }

    const [rows] = await pool.execute<ApproverHierarchyQueryResult[]>(
      `SELECT DISTINCT
        ah.hid,
        ah.hlevel,
        r.RoleId AS roleId,
        r.RoleName AS roleName,
        s.ScopeId AS scopeId,
        s.ScopeName AS scopeName,
        s.ScopeType AS scopeType
       FROM approval_hierarchies ah
       INNER JOIN roles r ON ah.RoleId = r.RoleId
       LEFT JOIN scopes s ON ah.ScopeId = s.ScopeId
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
        scopeName: r.scopeName || "Any Scope",
        scopeType: r.scopeType || "",
        currentApproverName: null,
        currentApproverEmail: null,
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
    if (!Number.isInteger(reqid) || reqid <= 0) {
      return { success: false, error: "Invalid request id." };
    }

    const conn = await pool.getConnection();
    try {
      const result = await callRequestProcedure(
        conn,
        "CALL sp_cancel_request(?, ?, @status_code, @status_msg)",
        [reqid, user.id]
      );
      if (result.statusCode !== "SUCCESS") {
        if (result.statusCode === "ERROR") console.error("Cancel request procedure:", result.statusMessage);
        return { success: false, error: procedureErrors[result.statusCode] ?? "Failed to cancel request." };
      }

      revalidatePath("/dashboard/requests");
      revalidatePath("/dashboard/approvals");
      return { success: true, message: "Request cancelled successfully." };
    } finally {
      conn.release();
    }
  } catch (error: unknown) {
    console.error("Failed to cancel request:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel request.";
    return { success: false, error: message };
  }
}
