import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import Link from "next/link";

interface AdminStatRow extends RowDataPacket {
  totalAllocations: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  totalUsers: number;
  totalResources: number;
}

interface RecentAdminRequest extends RowDataPacket {
  reqid: number;
  purpose: string | null;
  reqtime: Date;
  reqstatus: string;
  requesterName: string | null;
  resourceName: string | null;
}

interface RecentAdminAllocation extends RowDataPacket {
  allocationid: number;
  allocationstatus: string;
  starttime: Date;
  resourceName: string | null;
  requesterName: string | null;
}

function formatDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();

  // Advance lifecycle states (SCHEDULED -> ONGOING -> COMPLETED) based on current time
  try {
    await pool.query("CALL sp_update_allocation_statuses()");
  } catch (err) {
    console.error("Auto status update failed:", err);
  }

  // 1. Fetch system statistics
  const [statRows] = await pool.execute<AdminStatRow[]>(`
    SELECT
      (SELECT COUNT(*) FROM allocations) AS totalAllocations,
      (SELECT COUNT(*) FROM requests) AS totalRequests,
      (SELECT COUNT(*) FROM requests WHERE reqstatus = 'PENDING') AS pendingRequests,
      (SELECT COUNT(*) FROM requests WHERE reqstatus = 'APPROVED') AS approvedRequests,
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM resources) AS totalResources
  `);
  const stats = statRows[0] || {
    totalAllocations: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    totalUsers: 0,
    totalResources: 0,
  };

  // 2. Fetch recent requests
  const [recentRequests] = await pool.execute<RecentAdminRequest[]>(`
    SELECT
      r.reqid,
      r.purpose,
      r.reqtime,
      r.reqstatus,
      u.name AS requesterName,
      res.name AS resourceName
    FROM requests r
    INNER JOIN users u ON r.requesterid = u.id
    INNER JOIN resources res ON r.resid = res.id
    ORDER BY r.reqtime DESC
    LIMIT 5
  `);

  // 3. Fetch recent allocations
  const [recentAllocations] = await pool.execute<RecentAdminAllocation[]>(`
    SELECT
      a.allocationid,
      a.allocationstatus,
      req.starttime,
      res.name AS resourceName,
      u.name AS requesterName
    FROM allocations a
    INNER JOIN requests req ON a.reqid = req.reqid
    INNER JOIN resources res ON req.resid = res.id
    INNER JOIN users u ON req.requesterid = u.id
    ORDER BY req.starttime DESC
    LIMIT 5
  `);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Admin Hero Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/40 border border-purple-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider">
              Super Admin Console
            </span>
            <span className="text-xs text-slate-400">CRAS System Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Logged in as <strong className="text-purple-300">{admin.name || admin.email}</strong>. Manage institutional resource allocations, oversee approval chains, administer campus facilities, and manage user roles & scopes.
          </p>
        </div>
      </div>

      {/* ── Key System Metrics Strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Allocations */}
        <Link
          href="/admin/allocations"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition-all group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Allocations</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalAllocations}</div>
          <p className="text-[11px] text-slate-500 group-hover:text-purple-300 transition-colors">
            View all confirmed bookings →
          </p>
        </Link>

        {/* Metric 2: Total Requests */}
        <Link
          href="/admin/requests"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition-all group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Requests</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalRequests}</div>
          <p className="text-[11px] text-slate-500 group-hover:text-purple-300 transition-colors">
            {stats.pendingRequests} pending • {stats.approvedRequests} approved →
          </p>
        </Link>

        {/* Metric 3: Users */}
        <Link
          href="/admin/users"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition-all group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Users & Roles</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
          <p className="text-[11px] text-slate-500 group-hover:text-purple-300 transition-colors">
            Manage user roles & scopes →
          </p>
        </Link>

        {/* Metric 4: Resources */}
        <Link
          href="/admin/resources"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition-all group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Campus Resources</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalResources}</div>
          <p className="text-[11px] text-slate-500 group-hover:text-purple-300 transition-colors">
            Insert, update, delete facilities →
          </p>
        </Link>
      </div>

      {/* ── Quick Administrative Actions ─────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Administrative Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            href="/admin/allocations"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                View Allocations
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Browse confirmed reservations, filter by facility and active slots
              </p>
            </div>
          </Link>

          <Link
            href="/admin/requests"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                All Requests & Chains
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Inspect every booking request and expand sequential approval steps
              </p>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                Users & Roles
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Assign and revoke role-scopes, or safely delete accounts
              </p>
            </div>
          </Link>

          <Link
            href="/admin/resources"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                Manage Resources
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Create new halls/labs, update pipelines, or delete facilities
              </p>
            </div>
          </Link>

          <Link
            href="/admin/roles-scopes"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-pink-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                Roles & Scopes
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Define institutional roles, departments, clubs, and permissions
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Dual Activity Feed Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests Feed */}
        <div className="p-6 rounded-3xl bg-slate-900/85 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Recent Requests
            </h2>
            <Link
              href="/admin/requests"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View all →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentRequests.map((r) => (
              <div
                key={r.reqid}
                className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-indigo-400">#{r.reqid}</span>
                    <strong className="text-slate-200 truncate">{r.resourceName}</strong>
                  </div>
                  <p className="text-slate-400 text-[11px] truncate">
                    By {r.requesterName} • {formatDate(r.reqtime)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 shrink-0">
                  {r.reqstatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Allocations Feed */}
        <div className="p-6 rounded-3xl bg-slate-900/85 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Recent Allocations
            </h2>
            <Link
              href="/admin/allocations"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              View all →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentAllocations.map((a) => (
              <div
                key={a.allocationid}
                className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-emerald-400">ALLOC-{a.allocationid}</span>
                    <strong className="text-slate-200 truncate">{a.resourceName}</strong>
                  </div>
                  <p className="text-slate-400 text-[11px] truncate">
                    For {a.requesterName} • Slot: {formatDate(a.starttime)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  {a.allocationstatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

