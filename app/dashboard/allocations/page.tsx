import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/db";
import { users, resources, requests, allocations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statusConfig = {
  SCHEDULED: { label: "Scheduled", cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  ONGOING: { label: "Ongoing", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-700/20 text-slate-400 border-slate-700/40" },
} as const;

export default async function AllocationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!currentUser) {
    redirect("/onboarding");
  }

  // Fetch allocations for this user's approved requests
  const dbAllocations = await db
    .select({
      allocationid: allocations.allocationid,
      allocationstatus: allocations.allocationstatus,
      reqid: requests.reqid,
      resid: requests.resid,
      purpose: requests.purpose,
      starttime: requests.starttime,
      endtime: requests.endtime,
      resourceName: resources.name,
      resourceType: resources.type,
      resourceLocation: resources.location,
    })
    .from(allocations)
    .innerJoin(requests, eq(allocations.reqid, requests.reqid))
    .leftJoin(resources, eq(requests.resid, resources.id))
    .where(eq(requests.requesterid, currentUser.id))
    .orderBy(desc(requests.starttime));

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">My Allocations</h1>
        <p className="text-sm text-slate-400 mt-1">
          Resources confirmed and allocated to you after full approval.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
          <span className="font-bold text-white">{dbAllocations.length}</span>{" "}
          allocation{dbAllocations.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Allocation Cards */}
      {dbAllocations.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">No allocations yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Once your resource requests are fully approved, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {dbAllocations.map((alloc) => {
            const cfg = statusConfig[alloc.allocationstatus];
            return (
              <div
                key={alloc.allocationid}
                className="p-5 sm:p-6 bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-3xl transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      #{alloc.allocationid}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {alloc.resourceName || alloc.resid}
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {alloc.resid}
                    </span>
                    {alloc.resourceLocation && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {alloc.resourceLocation}
                      </span>
                    )}
                  </div>

                  {alloc.purpose ? (
                    <p className="text-sm text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                      &ldquo;{alloc.purpose}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No specific purpose.</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="text-slate-400">
                      <span className="text-slate-500">From: </span>
                      <strong className="text-slate-200">{formatDateTime(alloc.starttime)}</strong>
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500">To: </span>
                      <strong className="text-slate-200">{formatDateTime(alloc.endtime)}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 sm:col-span-2">
                      For Request #{alloc.reqid}
                    </div>
                  </div>
                </div>

                {/* Right: Status */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${cfg.cls}`}>
                    {cfg.label}
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