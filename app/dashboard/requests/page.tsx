import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { UserRow, ResourceRow, RequestStatus, ResourceStatus } from "@/lib/types/db";
import { RowDataPacket } from "mysql2/promise";
import { redirect } from "next/navigation";
import RequestsView, { RequestRecord, ResourceItem } from "@/components/requests/RequestsView";
import { ApprovalStepDetail } from "@/components/requests/types";

interface UserRequestQueryResult extends RowDataPacket {
  reqid: number;
  requesterid: string;
  resid: string;
  purpose: string | null;
  reqtime: Date;
  starttime: Date;
  endtime: Date;
  reqstatus: RequestStatus;
  resourceName: string | null;
  resourceType: string | null;
  resourceLocation: string | null;
}

interface StepQueryResult extends RowDataPacket {
  hid: string;
  reqid: number;
  hlevel: number;
  approverid: string;
  approverName: string | null;
  approverEmail: string | null;
  approvalstatus: "PENDING" | "APPROVED" | "REJECTED";
  issuetime: Date;
  actiontime: Date | null;
  shortcomment: string | null;
}

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // Fetch current user
  const [userRows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email FROM users WHERE email = ? LIMIT 1`,
    [session.user.email]
  );

  const currentUser = userRows[0];
  if (!currentUser) {
    redirect("/onboarding");
  }

  // Fetch all resources available on campus
  const [dbResources] = await pool.execute<ResourceRow[]>(
    `SELECT id, name, type, capacity, location, status FROM resources`
  );

  // Fetch current user's requests joined with resource metadata
  const [dbRequests] = await pool.execute<UserRequestQueryResult[]>(
    `SELECT
      r.reqid,
      r.requesterid,
      r.resid,
      r.purpose,
      r.reqtime,
      r.starttime,
      r.endtime,
      r.reqstatus,
      res.name AS resourceName,
      res.type AS resourceType,
      res.location AS resourceLocation
     FROM requests r
     LEFT JOIN resources res ON r.resid = res.id
     WHERE r.requesterid = ?
     ORDER BY r.reqtime DESC`,
    [currentUser.id]
  );

  // Fetch approval steps for all of this user's requests
  const reqIds = dbRequests.map((r) => r.reqid);
  const stepsMap = new Map<number, ApprovalStepDetail[]>();

  if (reqIds.length > 0) {
    for (const reqid of reqIds) {
      const [rows] = await pool.execute<StepQueryResult[]>(
        `SELECT
          ast.hid,
          ast.reqid,
          ah.hlevel,
          ast.approverid,
          u.name AS approverName,
          u.email AS approverEmail,
          ast.approvalstatus,
          ast.issuetime,
          ast.actiontime,
          ast.shortcomment
         FROM approval_steps ast
         INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
         INNER JOIN users u ON ast.approverid = u.id
         WHERE ast.reqid = ?
         ORDER BY ah.hlevel ASC`,
        [reqid]
      );

      stepsMap.set(
        reqid,
        rows.map((r) => ({
          hid: r.hid,
          hlevel: r.hlevel,
          approverid: r.approverid,
          approverName: r.approverName,
          approverEmail: r.approverEmail,
          approvalstatus: r.approvalstatus,
          issuetime: new Date(r.issuetime).toISOString(),
          actiontime: r.actiontime ? new Date(r.actiontime).toISOString() : null,
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
    reqtime: new Date(r.reqtime).toISOString(),
    starttime: new Date(r.starttime).toISOString(),
    endtime: new Date(r.endtime).toISOString(),
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
    status: res.status as ResourceStatus,
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
