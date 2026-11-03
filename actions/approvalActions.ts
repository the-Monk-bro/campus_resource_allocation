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
  approverid: string;
  approverName: string | null;
  approverEmail: string | null;
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
        ast.approverid,
        u.name AS approverName,
        u.email AS approverEmail,
        ast.ActionByUserId AS actionByUserId,
        uAction.name AS actionByName,
        ast.approvalstatus,
        ast.issuetime,
        ast.actiontime,
        ast.shortcomment
       FROM approval_steps ast
       INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
       INNER JOIN roles r ON ah.RoleId = r.RoleId
       INNER JOIN scopes s ON ah.ScopeId = s.ScopeId
       INNER JOIN users u ON ast.approverid = u.id
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
        scopeName: r.scopeName,
        scopeType: r.scopeType,
        approverid: r.approverid,
        approverName: r.approverName,
        approverEmail: r.approverEmail,
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

    // Get all PENDING steps assigned to this user where the user still has an active matching assignment
    const [pendingSteps] = await pool.execute<PendingStepQueryResult[]>(
      `SELECT
        ast.hid,
        ast.reqid,
        ah.hlevel,
        r.RoleName AS roleName,
        s.ScopeName AS scopeName,
        s.ScopeType AS scopeType,
        ah.resid,
        ast.issuetime
       FROM approval_steps ast
       INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
       INNER JOIN roles r ON ah.RoleId = r.RoleId
       INNER JOIN scopes s ON ah.ScopeId = s.ScopeId
       INNER JOIN role_assignments ra ON ra.RoleId = ah.RoleId AND ra.ScopeId = ah.ScopeId
       WHERE ast.approverid = ?
         AND ast.approvalstatus = 'PENDING'
         AND ra.UserId = ?
         AND ra.ValidFrom <= NOW()
         AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       ORDER BY ast.issuetime ASC`,
      [currentUser.id, currentUser.id]
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

interface ApprovalStepCheckRow extends RowDataPacket {
  hid: string;
  reqid: number;
  approverid: string;
  approvalstatus: string;
}

// ---------------------------------------------------------------------------
// Act on an approval step: approve or reject
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

    // Verify this step exists and is PENDING
    const [stepRows] = await pool.execute<ApprovalStepCheckRow[]>(
      `SELECT hid, reqid, approverid, approvalstatus
       FROM approval_steps
       WHERE hid = ? AND reqid = ?
       LIMIT 1`,
      [input.hid, input.reqid]
    );

    const step = stepRows[0];
    if (!step) {
      return { success: false, error: "Approval step not found." };
    }

    if (step.approvalstatus !== "PENDING") {
      return { success: false, error: `This step has already been ${step.approvalstatus}.` };
    }

    // Verify user holds an active role assignment matching the hierarchy's required role & scope
    const [assignRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ra.AssignmentId
       FROM role_assignments ra
       INNER JOIN approval_hierarchies ah ON ah.RoleId = ra.RoleId AND ah.ScopeId = ra.ScopeId
       WHERE ah.hid = ?
         AND ra.UserId = ?
         AND ra.ValidFrom <= NOW()
         AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       LIMIT 1`,
      [input.hid, currentUser.id]
    );

    if (!assignRows || assignRows.length === 0) {
      return {
        success: false,
        error: "Unauthorized: You do not hold an active role assignment authorized to approve this step.",
      };
    }

    const activeAssignmentId = assignRows[0].AssignmentId;
    const newStatus = input.action === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = new Date();
    const shortcomment = input.comment?.trim().substring(0, 100) || null;

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Update the step with ActionByUserId and ActionAsAssignmentId
      await conn.execute(
        `UPDATE approval_steps
         SET approvalstatus = ?, actiontime = ?, shortcomment = ?, ActionByUserId = ?, ActionAsAssignmentId = ?
         WHERE hid = ? AND reqid = ?`,
        [newStatus, now, shortcomment, currentUser.id, activeAssignmentId, input.hid, input.reqid]
      );

      if (input.action === "REJECT") {
        // Reject the entire request
        await conn.execute(
          `UPDATE requests SET reqstatus = 'REJECTED' WHERE reqid = ?`,
          [input.reqid]
        );

        await conn.commit();

        revalidatePath("/dashboard/approvals");
        revalidatePath("/dashboard/requests");
        return { success: true, message: "Request rejected successfully." };
      }

      // Action is APPROVE — check if all steps for this request are now approved
      const [allSteps] = await conn.execute<RowDataPacket[]>(
        `SELECT approvalstatus FROM approval_steps WHERE reqid = ?`,
        [input.reqid]
      );

      const allApproved = allSteps.every((s) => s.approvalstatus === "APPROVED");

      if (allApproved) {
        // Final approval — mark request APPROVED and create allocation
        await conn.execute(
          `UPDATE requests SET reqstatus = 'APPROVED' WHERE reqid = ?`,
          [input.reqid]
        );

        // Create allocation (or update if already exists)
        await conn.execute(
          `INSERT INTO allocations (reqid, allocationstatus) VALUES (?, 'SCHEDULED')
           ON DUPLICATE KEY UPDATE allocationstatus = 'SCHEDULED'`,
          [input.reqid]
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/requests");
    revalidatePath("/dashboard/allocations");
    return {
      success: true,
      message: input.action === "APPROVE" ? "Request approved successfully." : "Request rejected.",
    };
  } catch (error: unknown) {
    console.error("Failed to act on approval:", error);
    const message = error instanceof Error ? error.message : "Failed to process approval action.";
    return { success: false, error: message };
  }
}
