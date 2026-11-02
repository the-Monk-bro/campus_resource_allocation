"use server";

import db from "@/db";
import {
  requests,
  resources,
  users,
  approval_hierarchies,
  approval_steps,
  allocations,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovalStepDetail {
  hid: string;
  hlevel: number;
  approverid: string;
  approverName: string | null;
  approverEmail: string | null;
  approvalstatus: "PENDING" | "APPROVED" | "REJECTED";
  issuetime: string;
  actiontime: string | null;
  shortcomment: string | null;
}

export interface PendingApprovalItem {
  hid: string;
  reqid: number;
  hlevel: number;
  // Request details
  requesterid: string;
  requesterName: string | null;
  requesterEmail: string | null;
  resid: string;
  resourceName: string | null;
  resourceLocation: string | null;
  purpose: string | null;
  starttime: string;
  endtime: string;
  reqtime: string;
  issuetime: string;
}

// ---------------------------------------------------------------------------
// Get approval steps for a specific request (for My Requests dropdown)
// ---------------------------------------------------------------------------
export async function getApprovalStepsForRequestAction(
  reqid: number
): Promise<{ success: true; steps: ApprovalStepDetail[] } | { success: false; error: string }> {
  try {
    const rows = await db
      .select({
        hid: approval_steps.hid,
        hlevel: approval_hierarchies.hlevel,
        approverid: approval_steps.approverid,
        approverName: users.name,
        approverEmail: users.email,
        approvalstatus: approval_steps.approvalstatus,
        issuetime: approval_steps.issuetime,
        actiontime: approval_steps.actiontime,
        shortcomment: approval_steps.shortcomment,
      })
      .from(approval_steps)
      .innerJoin(approval_hierarchies, eq(approval_steps.hid, approval_hierarchies.hid))
      .innerJoin(users, eq(approval_steps.approverid, users.id))
      .where(eq(approval_steps.reqid, reqid))
      .orderBy(asc(approval_hierarchies.hlevel));

    return {
      success: true,
      steps: rows.map((r) => ({
        hid: r.hid,
        hlevel: r.hlevel,
        approverid: r.approverid,
        approverName: r.approverName,
        approverEmail: r.approverEmail,
        approvalstatus: r.approvalstatus,
        issuetime: r.issuetime.toISOString(),
        actiontime: r.actiontime ? r.actiontime.toISOString() : null,
        shortcomment: r.shortcomment,
      })),
    };
  } catch (error: any) {
    console.error("Failed to fetch approval steps:", error);
    return { success: false, error: error?.message || "Failed to fetch approval steps." };
  }
}

// ---------------------------------------------------------------------------
// Get pending approvals for the currently logged-in approver
// Only shows steps where:
//   - approverid = current user
//   - approvalstatus = PENDING
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

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email));

    if (!currentUser) {
      return { success: false, error: "User not found." };
    }

    // Get all PENDING steps assigned to this approver
    const pendingSteps = await db
      .select({
        hid: approval_steps.hid,
        reqid: approval_steps.reqid,
        hlevel: approval_hierarchies.hlevel,
        resid: approval_hierarchies.resid,
        issuetime: approval_steps.issuetime,
      })
      .from(approval_steps)
      .innerJoin(approval_hierarchies, eq(approval_steps.hid, approval_hierarchies.hid))
      .where(
        and(
          eq(approval_steps.approverid, currentUser.id),
          eq(approval_steps.approvalstatus, "PENDING")
        )
      )
      .orderBy(asc(approval_steps.issuetime));

    // For each pending step, check if previous levels are all approved
    const eligibleItems: PendingApprovalItem[] = [];

    for (const step of pendingSteps) {
      // If this is level 1, no prerequisites
      if (step.hlevel === 1) {
        // Fetch full request + requester + resource info
        const item = await buildApprovalItem(step.hid, step.reqid, step.hlevel, step.issuetime);
        if (item) eligibleItems.push(item);
        continue;
      }

      // Check if all steps for this request at lower levels are APPROVED
      // Build a map of hlevel -> status for this request
      const statusMap = new Map<number, string>();
      const allStepsForReq = await db
        .select({
          hlevel: approval_hierarchies.hlevel,
          approvalstatus: approval_steps.approvalstatus,
        })
        .from(approval_steps)
        .innerJoin(approval_hierarchies, eq(approval_steps.hid, approval_hierarchies.hid))
        .where(eq(approval_steps.reqid, step.reqid));

      for (const s of allStepsForReq) {
        statusMap.set(s.hlevel, s.approvalstatus);
      }

      const allPreviousApproved = Array.from(statusMap.entries())
        .filter(([lvl]) => lvl < step.hlevel)
        .every(([, status]) => status === "APPROVED");

      if (allPreviousApproved) {
        const item = await buildApprovalItem(step.hid, step.reqid, step.hlevel, step.issuetime);
        if (item) eligibleItems.push(item);
      }
    }

    return { success: true, items: eligibleItems };
  } catch (error: any) {
    console.error("Failed to fetch pending approvals:", error);
    return { success: false, error: error?.message || "Failed to fetch pending approvals." };
  }
}

async function buildApprovalItem(
  hid: string,
  reqid: number,
  hlevel: number,
  issuetime: Date
): Promise<PendingApprovalItem | null> {
  const rows = await db
    .select({
      reqid: requests.reqid,
      requesterid: requests.requesterid,
      requesterName: users.name,
      requesterEmail: users.email,
      resid: requests.resid,
      resourceName: resources.name,
      resourceLocation: resources.location,
      purpose: requests.purpose,
      starttime: requests.starttime,
      endtime: requests.endtime,
      reqtime: requests.reqtime,
    })
    .from(requests)
    .innerJoin(users, eq(requests.requesterid, users.id))
    .leftJoin(resources, eq(requests.resid, resources.id))
    .where(eq(requests.reqid, reqid));

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    hid,
    reqid: r.reqid,
    hlevel,
    requesterid: r.requesterid,
    requesterName: r.requesterName,
    requesterEmail: r.requesterEmail,
    resid: r.resid,
    resourceName: r.resourceName,
    resourceLocation: r.resourceLocation,
    purpose: r.purpose,
    starttime: r.starttime.toISOString(),
    endtime: r.endtime.toISOString(),
    reqtime: r.reqtime.toISOString(),
    issuetime: issuetime.toISOString(),
  };
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

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email));

    if (!currentUser) {
      return { success: false, error: "User not found." };
    }

    // Verify this step belongs to the current user and is PENDING
    const [step] = await db
      .select()
      .from(approval_steps)
      .where(
        and(
          eq(approval_steps.hid, input.hid),
          eq(approval_steps.reqid, input.reqid),
          eq(approval_steps.approverid, currentUser.id)
        )
      );

    if (!step) {
      return { success: false, error: "Approval step not found or not assigned to you." };
    }

    if (step.approvalstatus !== "PENDING") {
      return { success: false, error: `This step has already been ${step.approvalstatus}.` };
    }

    const newStatus = input.action === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = new Date();

    // Update the step
    await db
      .update(approval_steps)
      .set({
        approvalstatus: newStatus,
        actiontime: now,
        shortcomment: input.comment?.trim().substring(0, 100) || null,
      })
      .where(
        and(
          eq(approval_steps.hid, input.hid),
          eq(approval_steps.reqid, input.reqid)
        )
      );

    if (input.action === "REJECT") {
      // Reject the entire request
      await db
        .update(requests)
        .set({ reqstatus: "REJECTED" })
        .where(eq(requests.reqid, input.reqid));

      revalidatePath("/dashboard/approvals");
      revalidatePath("/dashboard/requests");
      return { success: true, message: "Request rejected successfully." };
    }

    // Action is APPROVE — check if all steps for this request are now approved
    const allSteps = await db
      .select({ approvalstatus: approval_steps.approvalstatus })
      .from(approval_steps)
      .where(eq(approval_steps.reqid, input.reqid));

    const allApproved = allSteps.every((s) => s.approvalstatus === "APPROVED");

    if (allApproved) {
      // Final approval — mark request APPROVED and create allocation
      await db
        .update(requests)
        .set({ reqstatus: "APPROVED" })
        .where(eq(requests.reqid, input.reqid));

      // Create allocation
      await db.insert(allocations).values({
        reqid: input.reqid,
        allocationstatus: "SCHEDULED",
      });
    }
    // If not all approved, request stays PENDING; next level approver will see it

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/requests");
    revalidatePath("/dashboard/allocations");
    return { success: true, message: input.action === "APPROVE" ? "Request approved successfully." : "Request rejected." };
  } catch (error: any) {
    console.error("Failed to act on approval:", error);
    return { success: false, error: error?.message || "Failed to process approval action." };
  }
}
