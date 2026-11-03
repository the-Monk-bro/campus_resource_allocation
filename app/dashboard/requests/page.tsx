import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { UserRow, ResourceRow, RequestStatus, ResourceStatus } from "@/lib/types/db";
import { RowDataPacket } from "mysql2/promise";
import { redirect } from "next/navigation";
import RequestsView, { RequestRecord, ResourceItem } from "@/components/requests/RequestsView";
import { ApprovalStepDetail, UserActiveRoleAssignment } from "@/components/requests/types";

interface UserRequestQueryResult extends RowDataPacket {
  reqid: number;
  requesterid: string;
  requesterAssignmentId: number;
  requesterRoleName: string | null;
  requesterScopeName: string | null;
  requesterScopeType: string | null;
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

interface UserAssignmentQueryResult extends RowDataPacket {
  assignmentId: number;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  scopeType: string;
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

  // Fetch user's currently valid role assignments
  const [activeAssignRows] = await pool.execute<UserAssignmentQueryResult[]>(
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
    [currentUser.id]
  );

  // Fetch all resources available on campus
  const [dbResources] = await pool.execute<ResourceRow[]>(
    `SELECT id, name, type, capacity, location, status FROM resources`
  );

  // Fetch current user's requests joined with role assignment and resource metadata
  const [dbRequests] = await pool.execute<UserRequestQueryResult[]>(
    `SELECT
      r.reqid,
      r.requesterid,
      r.RequesterAssignmentId AS requesterAssignmentId,
      reqRole.RoleName AS requesterRoleName,
      reqScope.ScopeName AS requesterScopeName,
      reqScope.ScopeType AS requesterScopeType,
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
     LEFT JOIN role_assignments reqRa ON r.RequesterAssignmentId = reqRa.AssignmentId
     LEFT JOIN roles reqRole ON reqRa.RoleId = reqRole.RoleId
     LEFT JOIN scopes reqScope ON reqRa.ScopeId = reqScope.ScopeId
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

      stepsMap.set(
        reqid,
        rows.map((r) => ({
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
        }))
      );
    }
  }

  // Serialize timestamps to ISO strings for the client component
  const serializedRequests: RequestRecord[] = dbRequests.map((r) => ({
    reqid: r.reqid,
    requesterid: r.requesterid,
    requesterAssignmentId: r.requesterAssignmentId,
    requesterRoleName: r.requesterRoleName,
    requesterScopeName: r.requesterScopeName,
    requesterScopeType: r.requesterScopeType,
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

  const serializedActiveAssignments: UserActiveRoleAssignment[] = activeAssignRows.map((a) => ({
    assignmentId: a.assignmentId,
    roleId: a.roleId,
    roleName: a.roleName,
    scopeId: a.scopeId,
    scopeName: a.scopeName,
    scopeType: a.scopeType,
  }));

  return (
    <RequestsView
      resources={serializedResources}
      initialRequests={serializedRequests}
      activeAssignments={serializedActiveAssignments}
      currentUserId={currentUser.id}
      currentUserName={currentUser.name || session.user.name || "User"}
    />
  );
}
