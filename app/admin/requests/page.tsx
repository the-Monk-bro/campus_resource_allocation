import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import RequestsAdminView, { AdminRequestItem } from "@/components/admin/RequestsAdminView";
import { ApprovalStepDetail } from "@/components/requests/types";
import { ClipboardList, Shield } from "lucide-react";

interface DbRequestRow extends RowDataPacket {
  reqid: number;
  purpose: string | null;
  reqtime: Date;
  starttime: Date;
  endtime: Date;
  reqstatus: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  resourceId: string;
  resourceName: string | null;
  resourceType: string | null;
  resourceLocation: string | null;
  requesterRoleName: string | null;
  requesterScopeName: string | null;
}

interface DbStepRow extends RowDataPacket {
  hid: string;
  reqid: number;
  hlevel: number;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  actionByUserId: string | null;
  actionByName: string | null;
  approvalstatus: "PENDING" | "APPROVED" | "REJECTED";
  issuetime: Date;
  actiontime: Date | null;
  shortcomment: string | null;
}

export default async function AdminRequestsPage() {
  await requireAdmin();

  // 1. Fetch all requests
  const [requestRows] = await pool.execute<DbRequestRow[]>(`
    SELECT
      r.reqid,
      r.purpose,
      r.reqtime,
      r.starttime,
      r.endtime,
      r.reqstatus,
      u.id AS requesterId,
      u.name AS requesterName,
      u.email AS requesterEmail,
      res.id AS resourceId,
      res.name AS resourceName,
      res.type AS resourceType,
      res.location AS resourceLocation,
      role.RoleName AS requesterRoleName,
      scope.ScopeName AS requesterScopeName
    FROM requests r
    INNER JOIN users u ON r.requesterid = u.id
    INNER JOIN resources res ON r.resid = res.id
    LEFT JOIN role_assignments ra ON r.RequesterAssignmentId = ra.AssignmentId
    LEFT JOIN roles role ON ra.RoleId = role.RoleId
    LEFT JOIN scopes scope ON ra.ScopeId = scope.ScopeId
    ORDER BY r.reqtime DESC
  `);

  // 2. Fetch all approval steps with reviewer names
  const [stepRows] = await pool.execute<DbStepRow[]>(`
    SELECT
      ast.hid,
      ast.reqid,
      ah.hlevel,
      r.RoleId AS roleId,
      r.RoleName AS roleName,
      s.ScopeId AS scopeId,
      s.ScopeName AS scopeName,
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
    ORDER BY ast.reqid DESC, ah.hlevel ASC
  `);

  // Map steps by reqid
  const stepsByReqId = new Map<number, ApprovalStepDetail[]>();
  for (const s of stepRows) {
    const list = stepsByReqId.get(s.reqid) || [];
    list.push({
      hid: s.hid,
      hlevel: s.hlevel,
      roleId: s.roleId,
      roleName: s.roleName,
      scopeId: s.scopeId,
      scopeName: s.scopeName || "Any Scope",
      actionByUserId: s.actionByUserId,
      actionByName: s.actionByName,
      approvalstatus: s.approvalstatus,
      issuetime: s.issuetime.toISOString(),
      actiontime: s.actiontime ? s.actiontime.toISOString() : null,
      shortcomment: s.shortcomment,
    });
    stepsByReqId.set(s.reqid, list);
  }

  const initialRequests: AdminRequestItem[] = requestRows.map((r) => ({
    reqid: r.reqid,
    purpose: r.purpose,
    reqtime: r.reqtime.toISOString(),
    starttime: r.starttime.toISOString(),
    endtime: r.endtime.toISOString(),
    reqstatus: r.reqstatus,
    requesterId: r.requesterId,
    requesterName: r.requesterName,
    requesterEmail: r.requesterEmail,
    resourceId: r.resourceId,
    resourceName: r.resourceName,
    resourceType: r.resourceType,
    resourceLocation: r.resourceLocation,
    requesterRoleName: r.requesterRoleName,
    requesterScopeName: r.requesterScopeName,
    steps: stepsByReqId.get(r.reqid) || [],
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-600" />
            Audit Console
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-indigo-600" />
          All Institutional Requests
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Audit every resource reservation submitted across campus, inspect sequential multi-tier approval pipelines, and review approver decisions and audit trails.
        </p>
      </div>

      <RequestsAdminView initialRequests={initialRequests} />
    </div>
  );
}
