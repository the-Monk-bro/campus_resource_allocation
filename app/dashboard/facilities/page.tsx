import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import { RowDataPacket } from "mysql2/promise";
import Link from "next/link";
import FacilitiesDirectory, { FacilityItem } from "@/components/facilities/FacilitiesDirectory";
import { CalendarPlus } from "lucide-react";

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

  // Fetch all campus resources and active booking counts using resource utilization view
  const [rows] = await pool.execute<FacilityQueryResult[]>(
    `SELECT
      ResourceId AS id,
      ResourceName AS name,
      ResourceType AS type,
      Capacity AS capacity,
      Location AS location,
      ResourceStatus AS status,
      ActiveAllocations AS confirmedAllocations
     FROM vw_resource_utilization
     ORDER BY ResourceType ASC, ResourceName ASC`
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Facilities Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explore specifications, capacities, and active availability for campus venues.
          </p>
        </div>

        <Link
          href="/dashboard/requests"
          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>New Reservation</span>
        </Link>
      </div>

      {/* Interactive Directory Grid */}
      <FacilitiesDirectory facilities={facilities} />
    </div>
  );
}
