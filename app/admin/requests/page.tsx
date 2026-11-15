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

  // 1. Fetch all requests using analytical pipeline view
  const [requestRows] = await pool.execute<DbRequestRow[]>(`
    SELECT
      RequestId AS reqid,
      Purpose AS purpose,
      RequestTime AS reqtime,
      StartTime AS starttime,
      EndTime AS endtime,
      RequestStatus AS reqstatus,
      RequesterId AS requesterId,
      RequesterName AS requesterName,
      RequesterEmail AS requesterEmail,
      ResourceId AS resourceId,
      ResourceName AS resourceName,
      ResourceType AS resourceType,
      ResourceLocation AS resourceLocation,
      RequesterRoleName AS requesterRoleName,
      RequesterScopeName AS requesterScopeName
    FROM vw_request_pipeline
    ORDER BY RequestTime DESC
  `);

  // 2. Fetch all approval steps with reviewer names using audit view
  const [stepRows] = await pool.execute<DbStepRow[]>(`
    SELECT
      HierarchyId AS hid,
      RequestId AS reqid,
      HierarchyLevel AS hlevel,
      RequiredRoleId AS roleId,
      RequiredRoleName AS roleName,
      RequiredScopeId AS scopeId,
      RequiredScopeName AS scopeName,
      ActionByUserId AS actionByUserId,
      ActionByUserName AS actionByName,
      StepStatus AS approvalstatus,
      StepIssuedTime AS issuetime,
      StepActionTime AS actiontime,
      ApproverComment AS shortcomment
    FROM vw_approval_pipeline_audit
    ORDER BY RequestId DESC, HierarchyLevel ASC
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
