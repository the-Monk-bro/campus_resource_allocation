import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/db";
import { users, resources, requests, approval_steps, approval_hierarchies } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import RequestsView, { RequestRecord, ResourceItem } from "@/components/requests/RequestsView";
import { ApprovalStepDetail } from "@/components/requests/types";

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // Fetch current user
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!currentUser) {
    redirect("/onboarding");
  }

  // Fetch all resources available on campus
  const dbResources = await db.select().from(resources);

  // Fetch current user's requests joined with resource metadata
  const dbRequests = await db
    .select({
      reqid: requests.reqid,
      requesterid: requests.requesterid,
      resid: requests.resid,
      purpose: requests.purpose,
      reqtime: requests.reqtime,
      starttime: requests.starttime,
      endtime: requests.endtime,
      reqstatus: requests.reqstatus,
      resourceName: resources.name,
      resourceType: resources.type,
      resourceLocation: resources.location,
    })
    .from(requests)
    .leftJoin(resources, eq(requests.resid, resources.id))
    .where(eq(requests.requesterid, currentUser.id))
    .orderBy(desc(requests.reqtime));

  // Fetch approval steps for all of this user's requests
  const reqIds = dbRequests.map((r) => r.reqid);

  // Build a map of reqid -> approval steps
  const stepsMap = new Map<number, ApprovalStepDetail[]>();

  if (reqIds.length > 0) {
    // Fetch all steps for these requests in one query
    for (const reqid of reqIds) {
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

      stepsMap.set(
        reqid,
        rows.map((r) => ({
          hid: r.hid,
          hlevel: r.hlevel,
          approverid: r.approverid,
          approverName: r.approverName,
          approverEmail: r.approverEmail,
          approvalstatus: r.approvalstatus,
          issuetime: r.issuetime.toISOString(),
          actiontime: r.actiontime ? r.actiontime.toISOString() : null,
          shortcomment: r.shortcomment,
        }))
      );
    }
  }

  // Serialize timestamps to ISO strings for the client component
  const serializedRequests: RequestRecord[] = dbRequests.map((r) => ({
    reqid: r.reqid,
    requesterid: r.requesterid,
    resid: r.resid,
    purpose: r.purpose,
    reqtime: r.reqtime.toISOString(),
    starttime: r.starttime.toISOString(),
    endtime: r.endtime.toISOString(),
    reqstatus: r.reqstatus,
    resourceName: r.resourceName,
    resourceType: r.resourceType,
    resourceLocation: r.resourceLocation,
    approvalSteps: stepsMap.get(r.reqid) ?? [],
  }));

  const serializedResources: ResourceItem[] = dbResources.map((res) => ({
    id: res.id,
    name: res.name,
    type: res.type,
    capacity: res.capacity,
    location: res.location,
    status: res.status,
  }));

  return (
    <RequestsView
      resources={serializedResources}
      initialRequests={serializedRequests}
      currentUserId={currentUser.id}
      currentUserName={currentUser.name || session.user.name || "User"}
    />
  );
}