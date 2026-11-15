import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import AllocationsAdminView, { AdminAllocationItem } from "@/components/admin/AllocationsAdminView";
import { CalendarRange, Shield } from "lucide-react";

interface DbAllocationRow extends RowDataPacket {
  allocationid: number;
  allocationstatus: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  reqid: number;
  purpose: string | null;
  starttime: Date;
  endtime: Date;
  reqstatus: string;
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

export default async function AdminAllocationsPage() {
  await requireAdmin();

  // Advance lifecycle states (SCHEDULED -> ONGOING -> COMPLETED) based on current time
  try {
    await pool.query("CALL sp_update_allocation_statuses()");
  } catch (err) {
    console.error("Auto status update failed:", err);
  }

  const [rows] = await pool.execute<DbAllocationRow[]>(`
    SELECT
      a.allocationid,
      a.allocationstatus,
      r.reqid,
      r.purpose,
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
    FROM allocations a
    INNER JOIN requests r ON a.reqid = r.reqid
    INNER JOIN users u ON r.requesterid = u.id
    INNER JOIN resources res ON r.resid = res.id
    LEFT JOIN role_assignments ra ON r.RequesterAssignmentId = ra.AssignmentId
    LEFT JOIN roles role ON ra.RoleId = role.RoleId
    LEFT JOIN scopes scope ON ra.ScopeId = scope.ScopeId
    ORDER BY r.starttime DESC
  `);

  const initialAllocations: AdminAllocationItem[] = rows.map((r) => ({
    allocationid: r.allocationid,
    allocationstatus: r.allocationstatus,
    reqid: r.reqid,
    purpose: r.purpose,
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
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-600" />
            Admin Operations
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <CalendarRange className="w-7 h-7 text-indigo-600" />
          Campus Resource Allocations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Live institutional calendar audit. Monitor all confirmed room and facility bookings across campus with lifecycle state filtering and schedule details.
        </p>
      </div>

      <AllocationsAdminView initialAllocations={initialAllocations} />
    </div>
  );
}
