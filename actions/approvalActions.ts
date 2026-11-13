"use server";

import pool from "@/lib/db";
import { UserRow } from "@/lib/types/db";
import { ApprovalStepDetail } from "@/components/requests/types";
import { RowDataPacket } from "mysql2/promise";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingApprovalItem {
  hid: string;
  reqid: number;
  hlevel: number;
  roleName: string;
  scopeName: string;
  scopeType: string;
  // Request details
  requesterid: string;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterRoleName: string | null;
  requesterScopeName: string | null;
  requesterScopeType?: string | null;
  resid: string;
  resourceName: string | null;
  resourceLocation: string | null;
  purpose: string | null;
  starttime: string;
  endtime: string;
  reqtime: string;
  issuetime: string;
}

interface StepDetailQueryResult extends RowDataPacket {
  hid: string;
  hlevel: number;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  scopeType: string;
  actionByUserId: string | null;
  actionByName: string | null;
  approvalstatus: "PENDING" | "APPROVED" | "REJECTED";
  issuetime: Date;
  actiontime: Date | null;
  shortcomment: string | null;
}

// ---------------------------------------------------------------------------
// Get approval steps for a specific request (for My Requests dropdown)
// ---------------------------------------------------------------------------
export async function getApprovalStepsForRequestAction(
  reqid: number
): Promise<{ success: true; steps: ApprovalStepDetail[] } | { success: false; error: string }> {
  try {
    const [rows] = await pool.execute<StepDetailQueryResult[]>(
      `SELECT
        ast.hid,
        ah.hlevel,
        r.RoleId AS roleId,
        r.RoleName AS roleName,
        s.ScopeId AS scopeId,
        s.ScopeName AS scopeName,
        s.ScopeType AS scopeType,
        ast.ActionByUserId AS actionByUserId,
        uAction.name AS actionByName,
        ast.approvalstatus,
        ast.issuetime,
        ast.actiontime,
        ast.shortcomment
       FROM approval_steps ast
       INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
       INNER JOIN roles r ON ah.RoleId = r.RoleId
       LEFT JOIN scopes s ON ah.ScopeId = s.ScopeId
       LEFT JOIN users uAction ON ast.ActionByUserId = uAction.id
       WHERE ast.reqid = ?
       ORDER BY ah.hlevel ASC`,
      [reqid]
    );

    return {
      success: true,
      steps: rows.map((r) => ({
        hid: r.hid,
        hlevel: r.hlevel,
        roleId: r.roleId,
        roleName: r.roleName,
        scopeId: r.scopeId,
        scopeName: r.scopeName || "Any Scope",
        scopeType: r.scopeType,
        actionByUserId: r.actionByUserId,
        actionByName: r.actionByName,
        approvalstatus: r.approvalstatus,
        issuetime: new Date(r.issuetime).toISOString(),
        actiontime: r.actiontime ? new Date(r.actiontime).toISOString() : null,
        shortcomment: r.shortcomment,
      })),
    };
  } catch (error: unknown) {
    console.error("Failed to fetch approval steps:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch approval steps.";
    return { success: false, error: message };
  }
}

interface PendingStepQueryResult extends RowDataPacket {
  hid: string;
  reqid: number;
  hlevel: number;
  roleName: string;
  scopeName: string;
  scopeType: string;
  resid: string;
  issuetime: Date;
}

interface StepStatusQueryResult extends RowDataPacket {
  hlevel: number;
  approvalstatus: string;
}

// ---------------------------------------------------------------------------
// Get pending approvals for the currently logged-in approver
// Only shows steps where:
//   - approverid = current user
//   - approvalstatus = PENDING
//   - User still holds an active assignment for the required role & scope
//   - All lower-level steps for the same request are APPROVED (or level 1)
// ---------------------------------------------------------------------------
export async function getMyPendingApprovalsAction(): Promise<
  { success: true; items: PendingApprovalItem[] } | { success: false; error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized." };
    }

    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, name, email FROM users WHERE email = ? LIMIT 1`,
      [session.user.email]
    );

    const currentUser = userRows[0];
    if (!currentUser) {
      return { success: false, error: "User not found." };
    }

    // Get all PENDING steps where the current user holds an active matching role assignment for the step's (RoleId, ScopeId)
    const [pendingSteps] = await pool.execute<PendingStepQueryResult[]>(
      `SELECT DISTINCT
        ast.hid,
        ast.reqid,
        ah.hlevel,
        r.RoleName AS roleName,
        COALESCE(s.ScopeName, 'Any Scope') AS scopeName,
        COALESCE(s.ScopeType, '') AS scopeType,
        ah.resid,
        ast.issuetime
       FROM approval_steps ast
       INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
       INNER JOIN roles r ON ah.RoleId = r.RoleId
       LEFT JOIN scopes s ON ah.ScopeId = s.ScopeId
       INNER JOIN role_assignments ra ON ra.RoleId = ah.RoleId AND (ah.ScopeId IS NULL OR ra.ScopeId = ah.ScopeId)
       WHERE ast.approvalstatus = 'PENDING'
         AND ra.UserId = ?
         AND ra.ValidFrom <= NOW()
         AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       ORDER BY ast.issuetime ASC`,
      [currentUser.id]
    );

    // For each pending step, check if previous levels are all approved
    const eligibleItems: PendingApprovalItem[] = [];

    for (const step of pendingSteps) {
      // If this is level 1, no prerequisites
      if (step.hlevel === 1) {
        const item = await buildApprovalItem(
          step.hid,
          step.reqid,
          step.hlevel,
          step.roleName,
          step.scopeName,
          step.scopeType,
          new Date(step.issuetime)
        );
        if (item) eligibleItems.push(item);
        continue;
      }

      // Check if all steps for this request at lower levels are APPROVED
      const [allStepsForReq] = await pool.execute<StepStatusQueryResult[]>(
        `SELECT
          ah.hlevel,
          ast.approvalstatus
         FROM approval_steps ast
         INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
         WHERE ast.reqid = ?`,
        [step.reqid]
      );

      const statusMap = new Map<number, string>();
      for (const s of allStepsForReq) {
        statusMap.set(s.hlevel, s.approvalstatus);
      }

      const allPreviousApproved = Array.from(statusMap.entries())
        .filter(([lvl]) => lvl < step.hlevel)
        .every(([, status]) => status === "APPROVED");

      if (allPreviousApproved) {
        const item = await buildApprovalItem(
          step.hid,
          step.reqid,
          step.hlevel,
          step.roleName,
          step.scopeName,
          step.scopeType,
          new Date(step.issuetime)
        );
        if (item) eligibleItems.push(item);
      }
    }

    return { success: true, items: eligibleItems };
  } catch (error: unknown) {
    console.error("Failed to fetch pending approvals:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch pending approvals.";
    return { success: false, error: message };
  }
}

interface BuildApprovalItemQueryResult extends RowDataPacket {
  reqid: number;
  requesterid: string;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterRoleName: string | null;
  requesterScopeName: string | null;
  requesterScopeType?: string | null;
  resid: string;
  resourceName: string | null;
  resourceLocation: string | null;
  purpose: string | null;
  starttime: Date;
  endtime: Date;
  reqtime: Date;
}

async function buildApprovalItem(
  hid: string,
  reqid: number,
  hlevel: number,
  roleName: string,
  scopeName: string,
  scopeType: string,
  issuetime: Date
): Promise<PendingApprovalItem | null> {
  const [rows] = await pool.execute<BuildApprovalItemQueryResult[]>(
    `SELECT
      r.reqid,
      r.requesterid,
      u.name AS requesterName,
      u.email AS requesterEmail,
      reqRole.RoleName AS requesterRoleName,
      reqScope.ScopeName AS requesterScopeName,
      reqScope.ScopeType AS requesterScopeType,
      r.resid,
      res.name AS resourceName,
      res.location AS resourceLocation,
      r.purpose,
      r.starttime,
      r.endtime,
      r.reqtime
     FROM requests r
     INNER JOIN users u ON r.requesterid = u.id
     LEFT JOIN role_assignments reqRa ON r.RequesterAssignmentId = reqRa.AssignmentId
     LEFT JOIN roles reqRole ON reqRa.RoleId = reqRole.RoleId
     LEFT JOIN scopes reqScope ON reqRa.ScopeId = reqScope.ScopeId
     LEFT JOIN resources res ON r.resid = res.id
     WHERE r.reqid = ?
     LIMIT 1`,
    [reqid]
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    hid,
    reqid: r.reqid,
    hlevel,
    roleName,
    scopeName,
    scopeType,
    requesterid: r.requesterid,
    requesterName: r.requesterName,
    requesterEmail: r.requesterEmail,
    requesterRoleName: r.requesterRoleName,
    requesterScopeName: r.requesterScopeName,
    requesterScopeType: r.requesterScopeType,
    resid: r.resid,
    resourceName: r.resourceName,
    resourceLocation: r.resourceLocation,
    purpose: r.purpose,
    starttime: new Date(r.starttime).toISOString(),
    endtime: new Date(r.endtime).toISOString(),
    reqtime: new Date(r.reqtime).toISOString(),
    issuetime: issuetime.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Act on an approval step: approve or reject
// Handled directly by MySQL stored procedure sp_process_approval_action
// and workflow triggers (trg_enforce_sequential_approval, trg_approval_step_after_update)
// ---------------------------------------------------------------------------
export async function actOnApprovalAction(input: {
  hid: string;
  reqid: number;
  action: "APPROVE" | "REJECT";
  comment?: string;
}): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized." };
    }

    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [session.user.email]
    );

    const currentUser = userRows[0];
    if (!currentUser) {
      return { success: false, error: "User not found." };
    }

    const shortcomment = input.comment?.trim().substring(0, 100) || null;

    // Use a dedicated connection so session variables (@out_code, @out_msg) persist across CALL and SELECT
    // without requiring multipleStatements: true on the pool.
    const conn = await pool.getConnection();
    let statusCode: string | undefined;
    let statusMessage: string | undefined;

    try {
      await conn.query(
        `CALL sp_process_approval_action(?, ?, ?, ?, ?, @out_code, @out_msg)`,
        [input.hid, input.reqid, currentUser.id, input.action, shortcomment]
      );

      const [outRows] = await conn.query<RowDataPacket[]>(
        `SELECT @out_code AS statusCode, @out_msg AS statusMessage`
      );

      statusCode = outRows[0]?.statusCode;
      statusMessage = outRows[0]?.statusMessage;
    } finally {
      conn.release();
    }

    if (statusCode !== "SUCCESS") {
      return {
        success: false,
        error: statusMessage || "Failed to process approval action.",
      };
    }

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/requests");
    revalidatePath("/dashboard/allocations");

    return {
      success: true,
      message: statusMessage || (input.action === "APPROVE" ? "Step approved successfully." : "Request rejected."),
    };
  } catch (error: unknown) {
    console.error("Database error during approval action:", error);
    const message = error instanceof Error ? error.message : "Database operation failed.";
    return { success: false, error: message };
  }
}
