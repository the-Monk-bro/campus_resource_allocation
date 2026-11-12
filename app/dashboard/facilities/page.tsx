import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import { RowDataPacket } from "mysql2/promise";
import Link from "next/link";
import FacilitiesDirectory, { FacilityItem } from "@/components/facilities/FacilitiesDirectory";

interface FacilityQueryResult extends RowDataPacket {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
  confirmedAllocations: number;
}

export default async function FacilitiesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // Fetch all campus resources and active booking counts
  const [rows] = await pool.execute<FacilityQueryResult[]>(
    `SELECT
      r.id,
      r.name,
      r.type,
      r.capacity,
      r.location,
      r.status,
      COUNT(DISTINCT a.allocationid) AS confirmedAllocations
     FROM resources r
     LEFT JOIN requests req ON req.resid = r.id AND req.reqstatus = 'APPROVED'
     LEFT JOIN allocations a ON a.reqid = req.reqid AND a.allocationstatus IN ('SCHEDULED', 'ONGOING')
     GROUP BY r.id, r.name, r.type, r.capacity, r.location, r.status
     ORDER BY r.type ASC, r.name ASC`
  );

  const facilities: FacilityItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    capacity: r.capacity,
    location: r.location,
    status: r.status,
    confirmedAllocations: Number(r.confirmedAllocations) || 0,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Campus Facilities Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explore, check capacities, and reserve lecture halls, AI research laboratories, auditoriums, and seminar rooms.
          </p>
        </div>

        <Link
          href="/dashboard/requests"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Make Request</span>
        </Link>
      </div>

      {/* Interactive Directory Grid */}
      <FacilitiesDirectory facilities={facilities} />
    </div>
  );
}

