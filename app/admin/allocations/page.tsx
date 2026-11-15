import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import AllocationsAdminView, { AdminAllocationItem } from "@/components/admin/AllocationsAdminView";

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
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          All Campus Allocations
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor all confirmed room and facility bookings across the institution with status filtering and time slot sorting.
        </p>
      </div>

      <AllocationsAdminView initialAllocations={initialAllocations} />
    </div>
  );
}

