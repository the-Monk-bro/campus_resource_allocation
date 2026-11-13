import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import ResourcesAdminView, { AdminResourceItem } from "@/components/admin/ResourcesAdminView";

interface DbResourceRow extends RowDataPacket {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
  activeAllocations: number;
  totalRequests: number;
}

export default async function AdminResourcesPage() {
  await requireAdmin();

  const [rows] = await pool.execute<DbResourceRow[]>(`
    SELECT
      r.id,
      r.name,
      r.type,
      r.capacity,
      r.location,
      r.status,
      COUNT(DISTINCT a.allocationid) AS activeAllocations,
      COUNT(DISTINCT req.reqid) AS totalRequests
    FROM resources r
    LEFT JOIN requests req ON req.resid = r.id
    LEFT JOIN allocations a ON a.reqid = req.reqid AND a.allocationstatus IN ('SCHEDULED', 'ONGOING')
    GROUP BY r.id, r.name, r.type, r.capacity, r.location, r.status
    ORDER BY r.type ASC, r.name ASC
  `);

  const initialResources: AdminResourceItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    capacity: r.capacity,
    location: r.location,
    status: r.status,
    activeAllocations: Number(r.activeAllocations) || 0,
    totalRequests: Number(r.totalRequests) || 0,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Campus Facilities & Resources
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Create new facilities, update capacities and statuses, and decommission or delete resources with full transactional safety.
        </p>
      </div>

      <ResourcesAdminView initialResources={initialResources} />
    </div>
  );
}

