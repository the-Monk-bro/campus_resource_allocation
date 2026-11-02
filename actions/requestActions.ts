"use server";

import db from "@/db";
import { requests, resources, users, approval_hierarchies, approval_steps } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email));

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
    const [existingResource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, resid.trim()));

    if (!existingResource) {
      return { success: false, error: `Selected resource '${resid}' was not found in the database.` };
    }

    // Validate purpose length (max 100 chars per schema)
    const trimmedPurpose = purpose?.trim();
    if (trimmedPurpose && trimmedPurpose.length > 100) {
      return { success: false, error: "Purpose cannot exceed 100 characters." };
    }

    // Insert request
    const [inserted] = await db
      .insert(requests)
      .values({
        requesterid: user.id,
        resid: existingResource.id,
        purpose: trimmedPurpose || null,
        starttime: startDate,
        endtime: endDate,
        reqstatus: "PENDING",
        reqtime: new Date(),
      })
      .returning();

    // Auto-create all approval steps for this request based on the approval hierarchy
    const hierarchyRows = await db
      .select()
      .from(approval_hierarchies)
      .where(eq(approval_hierarchies.resid, existingResource.id))
      .orderBy(asc(approval_hierarchies.hlevel));

    if (hierarchyRows.length > 0) {
      await db.insert(approval_steps).values(
        hierarchyRows.map((h) => ({
          hid: h.hid,
          reqid: inserted.reqid,
          approverid: h.approverid,
          approvalstatus: "PENDING" as const,
          issuetime: new Date(),
        }))
      );
    }

    revalidatePath("/dashboard/requests");
    return {
      success: true,
      message: "Request submitted successfully!",
      requestId: inserted?.reqid,
    };
  } catch (error: any) {
    console.error("Failed to create request:", error);
    return {
      success: false,
      error: error?.message || "Failed to submit request due to a server error.",
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

export async function getApprovalHierarchyAction(
  resid: string
): Promise<{ success: true; approvers: ApproverInfo[] } | { success: false; error: string }> {
  try {
    if (!resid?.trim()) {
      return { success: false, error: "No resource specified." };
    }

    const rows = await db
      .select({
        hid: approval_hierarchies.hid,
        hlevel: approval_hierarchies.hlevel,
        approverId: users.id,
        approverName: users.name,
        approverEmail: users.email,
        approverRole: users.role,
        approverDepartment: users.department,
      })
      .from(approval_hierarchies)
      .innerJoin(users, eq(approval_hierarchies.approverid, users.id))
      .where(eq(approval_hierarchies.resid, resid.trim()))
      .orderBy(asc(approval_hierarchies.hlevel));

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
  } catch (error: any) {
    console.error("Failed to fetch approval hierarchy:", error);
    return {
      success: false,
      error: error?.message || "Failed to fetch approval hierarchy.",
    };
  }
}

export async function cancelRequestAction(reqid: number) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized." };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email));

    if (!user) {
      return { success: false, error: "User not found." };
    }

    // Verify the request belongs to this user
    const [existingReq] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.reqid, reqid), eq(requests.requesterid, user.id)));

    if (!existingReq) {
      return { success: false, error: "Request not found or not owned by you." };
    }

    if (existingReq.reqstatus !== "PENDING") {
      return { success: false, error: `Cannot cancel a request that is already ${existingReq.reqstatus}.` };
    }

    await db
      .update(requests)
      .set({ reqstatus: "CANCELLED" })
      .where(eq(requests.reqid, reqid));

    revalidatePath("/dashboard/requests");
    return { success: true, message: "Request cancelled successfully." };
  } catch (error: any) {
    console.error("Failed to cancel request:", error);
    return {
      success: false,
      error: error?.message || "Failed to cancel request.",
    };
  }
}
