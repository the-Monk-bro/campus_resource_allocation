import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import Link from "next/link";
import {
  Shield,
  CalendarRange,
  ClipboardList,
  Users,
  Building2,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

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

function getStatusBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Approved
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Rejected
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Cancelled
        </span>
      );
    case "ONGOING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Ongoing
        </span>
      );
    case "SCHEDULED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Scheduled
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Completed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending
        </span>
      );
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Admin Hero Banner ────────────────────────────────────────── */}
      <div className="saas-card p-6 sm:p-7 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold uppercase tracking-wider">
                Super Admin Console
              </span>
              <span className="text-xs text-slate-400">Institutional Governance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              System Administration Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Logged in as <strong className="text-slate-800">{admin.name || admin.email}</strong> &middot; Manage allocations, oversee approval chains, campus facilities, and RBAC roles.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-colors self-start sm:self-auto shrink-0 flex items-center gap-1.5"
          >
            <span>User Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 2. System Statistics Grid (6 Cards) ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="saas-card p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Allocations
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalAllocations}
          </div>
          <div className="text-[11px] text-slate-400">Confirmed</div>
        </div>

        <div className="saas-card p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Requests
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalRequests}
          </div>
          <div className="text-[11px] text-slate-400">All time</div>
        </div>

        <div className="saas-card p-4">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            Pending
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {stats.pendingRequests}
          </div>
          <div className="text-[11px] text-slate-400">Awaiting sign-off</div>
        </div>

        <div className="saas-card p-4">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Approved
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {stats.approvedRequests}
          </div>
          <div className="text-[11px] text-slate-400">Cleared</div>
        </div>

        <div className="saas-card p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Campus Users
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalUsers}
          </div>
          <div className="text-[11px] text-slate-400">Registered</div>
        </div>

        <div className="saas-card p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Facilities
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalResources}
          </div>
          <div className="text-[11px] text-slate-400">Resources</div>
        </div>
      </div>

      {/* ── 3. Quick Administration Shortcuts ────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Management Consoles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Link
            href="/admin/allocations"
            className="saas-card p-4 hover:border-purple-300 hover:shadow-xs transition-all space-y-1.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarRange className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
              All Allocations
            </h3>
            <p className="text-xs text-slate-500">
              Audit confirmed bookings &amp; time slots
            </p>
          </Link>

          <Link
            href="/admin/requests"
            className="saas-card p-4 hover:border-purple-300 hover:shadow-xs transition-all space-y-1.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
              All Requests
            </h3>
            <p className="text-xs text-slate-500">
              Track multi-level approval pipeline
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="saas-card p-4 hover:border-purple-300 hover:shadow-xs transition-all space-y-1.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
              Users &amp; Roles
            </h3>
            <p className="text-xs text-slate-500">
              Manage accounts &amp; role assignments
            </p>
          </Link>

          <Link
            href="/admin/resources"
            className="saas-card p-4 hover:border-purple-300 hover:shadow-xs transition-all space-y-1.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
              Resources &amp; Levels
            </h3>
            <p className="text-xs text-slate-500">
              Configure venues &amp; approval steps
            </p>
          </Link>

          <Link
            href="/admin/roles-scopes"
            className="saas-card p-4 hover:border-purple-300 hover:shadow-xs transition-all space-y-1.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
              Roles &amp; Scopes
            </h3>
            <p className="text-xs text-slate-500">
              Define RBAC roles &amp; departments
            </p>
          </Link>
        </div>
      </div>

      {/* ── 4. Two Split Tables (Recent Requests & Recent Allocations) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Recent Requests */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Latest Campus Requests
            </h3>
            <Link
              href="/admin/requests"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-3.5 py-2">Req ID</th>
                  <th className="px-3.5 py-2">Resource</th>
                  <th className="px-3.5 py-2">Requester</th>
                  <th className="px-3.5 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentRequests.map((req) => (
                  <tr key={req.reqid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 font-mono font-medium text-slate-600">
                      #{req.reqid}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-slate-900">
                        {req.resourceName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {req.purpose || "No purpose specified"}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700">
                      {req.requesterName || "Anonymous"}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {getStatusBadge(req.reqstatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Recent Allocations */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Active &amp; Upcoming Allocations
            </h3>
            <Link
              href="/admin/allocations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-3.5 py-2">Alloc ID</th>
                  <th className="px-3.5 py-2">Resource</th>
                  <th className="px-3.5 py-2">Booked For</th>
                  <th className="px-3.5 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentAllocations.map((alloc) => (
                  <tr key={alloc.allocationid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 font-mono font-medium text-slate-600">
                      #{alloc.allocationid}
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-900">
                      {alloc.resourceName}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      <div>{formatDate(alloc.starttime)}</div>
                      <div className="text-[11px] text-slate-400">
                        {alloc.requesterName}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {getStatusBadge(alloc.allocationstatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
