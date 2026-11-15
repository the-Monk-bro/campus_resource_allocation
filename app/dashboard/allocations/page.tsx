import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { UserRow, AllocationStatus } from "@/lib/types/db";
import { RowDataPacket } from "mysql2/promise";
import { redirect } from "next/navigation";
import { CalendarRange, MapPin, Calendar, CheckCircle2 } from "lucide-react";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statusConfig = {
  SCHEDULED: {
    label: "Scheduled",
    cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  ONGOING: {
    label: "Ongoing Now",
    cls: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dot: "bg-emerald-500 animate-pulse",
  },
  COMPLETED: {
    label: "Completed",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
} as const;

interface AllocationQueryResult extends RowDataPacket {
  allocationid: number;
  allocationstatus: AllocationStatus;
  reqid: number;
  resid: string;
  purpose: string | null;
  starttime: Date;
  endtime: Date;
  resourceName: string | null;
  resourceType: string | null;
  resourceLocation: string | null;
}

export default async function AllocationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const [userRows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email FROM users WHERE email = ? LIMIT 1`,
    [session.user.email]
  );

  const currentUser = userRows[0];
  if (!currentUser) {
    redirect("/onboarding");
  }

  // Advance lifecycle states (SCHEDULED -> ONGOING -> COMPLETED) based on current time
  try {
    await pool.query("CALL sp_update_allocation_statuses()");
  } catch (err) {
    console.error("Auto status update failed:", err);
  }

  // Fetch allocations for this user's approved requests
  const [dbAllocations] = await pool.execute<AllocationQueryResult[]>(
    `SELECT
      a.allocationid,
      a.allocationstatus,
      r.reqid,
      r.resid,
      r.purpose,
      r.starttime,
      r.endtime,
      res.name AS resourceName,
      res.type AS resourceType,
      res.location AS resourceLocation
     FROM allocations a
     INNER JOIN requests r ON a.reqid = r.reqid
     LEFT JOIN resources res ON r.resid = res.id
     WHERE r.requesterid = ?
     ORDER BY r.starttime DESC`,
    [currentUser.id]
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            My Allocations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Confirmed calendar reservations allocated to your account following full approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-semibold text-slate-700">
            {dbAllocations.length} Confirmed {dbAllocations.length !== 1 ? "Bookings" : "Booking"}
          </span>
        </div>
      </div>

      {/* Allocation Cards */}
      {dbAllocations.length === 0 ? (
        <div className="saas-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <CalendarRange className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Confirmed Allocations</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once your resource booking requests complete all approval tiers, they will appear here as confirmed reservations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {dbAllocations.map((alloc) => {
            const cfg =
              statusConfig[alloc.allocationstatus] || statusConfig.SCHEDULED;
            return (
              <div
                key={alloc.allocationid}
                className="saas-card p-5 sm:p-6 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Alloc #{alloc.allocationid}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {alloc.resourceName || alloc.resid}
                    </h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {alloc.resid}
                    </span>
                    {alloc.resourceLocation && (
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{alloc.resourceLocation}</span>
                      </span>
                    )}
                  </div>

                  {alloc.purpose ? (
                    <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-xs sm:text-sm text-slate-700 italic">
                      &ldquo;{alloc.purpose}&rdquo;
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No specific purpose stated.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        From:{" "}
                        <strong className="text-slate-900">
                          {formatDateTime(new Date(alloc.starttime))}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        To:{" "}
                        <strong className="text-slate-900">
                          {formatDateTime(new Date(alloc.endtime))}
                        </strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 sm:col-span-2">
                      Linked to Request #{alloc.reqid}
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span>{cfg.label}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
