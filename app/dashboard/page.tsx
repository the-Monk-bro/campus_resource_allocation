import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { UserRow } from "@/lib/types/db";
import { RowDataPacket } from "mysql2/promise";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getMyPendingApprovalsAction } from "@/actions/approvalActions";

interface UserAssignmentRow extends RowDataPacket {
  assignmentId: number;
  roleName: string;
  scopeName: string;
  validFrom: Date;
  validUntil: Date | null;
  isActive: number;
}

interface RecentRequestRow extends RowDataPacket {
  reqid: number;
  resid: string;
  purpose: string | null;
  reqtime: Date;
  starttime: Date;
  endtime: Date;
  reqstatus: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  resourceName: string | null;
  resourceType: string | null;
  resourceLocation: string | null;
  requesterRoleName: string | null;
  requesterScopeName: string | null;
}

interface StatsRow extends RowDataPacket {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

function getStatusBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Approved
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Rejected
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Pending
        </span>
      );
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // 1. Fetch current user from database
  const [userRows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email, image, phno FROM users WHERE email = ? LIMIT 1`,
    [session.user.email]
  );
  const user = userRows[0];

  if (!user) {
    redirect("/onboarding");
  }

  // 2. Fetch role assignments (Note: ScopeType is excluded from UI displays per project rules)
  const [assignments] = await pool.execute<UserAssignmentRow[]>(
    `SELECT
      ra.AssignmentId AS assignmentId,
      r.RoleName AS roleName,
      s.ScopeName AS scopeName,
      ra.ValidFrom AS validFrom,
      ra.ValidUntil AS validUntil,
      (ra.ValidFrom <= NOW() AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())) AS isActive
     FROM role_assignments ra
     INNER JOIN roles r ON ra.RoleId = r.RoleId
     INNER JOIN scopes s ON ra.ScopeId = s.ScopeId
     WHERE ra.UserId = ?
     ORDER BY isActive DESC, ra.ValidFrom DESC`,
    [user.id]
  );

  const activeAssignments = assignments.filter((a) => Boolean(a.isActive));
  const expiredAssignments = assignments.filter((a) => !Boolean(a.isActive));

  // 3. Fetch user's pending approvals count via the shared action
  const pendingApprovalsRes = await getMyPendingApprovalsAction();
  const pendingApprovalsCount = pendingApprovalsRes.success ? pendingApprovalsRes.items.length : 0;

  // 4. Fetch user's request summary stats
  const [statsRows] = await pool.execute<StatsRow[]>(
    `SELECT
      COUNT(*) AS totalRequests,
      COALESCE(SUM(CASE WHEN reqstatus = 'PENDING' THEN 1 ELSE 0 END), 0) AS pendingRequests,
      COALESCE(SUM(CASE WHEN reqstatus = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approvedRequests
     FROM requests
     WHERE requesterid = ?`,
    [user.id]
  );
  const userStats = statsRows[0] || { totalRequests: 0, pendingRequests: 0, approvedRequests: 0 };

  // 5. Fetch user's latest 5 requests
  const [recentRequests] = await pool.execute<RecentRequestRow[]>(
    `SELECT
      r.reqid,
      r.resid,
      r.purpose,
      r.reqtime,
      r.starttime,
      r.endtime,
      r.reqstatus,
      res.name AS resourceName,
      res.type AS resourceType,
      res.location AS resourceLocation,
      reqRole.RoleName AS requesterRoleName,
      reqScope.ScopeName AS requesterScopeName
     FROM requests r
     LEFT JOIN role_assignments reqRa ON r.RequesterAssignmentId = reqRa.AssignmentId
     LEFT JOIN roles reqRole ON reqRa.RoleId = reqRole.RoleId
     LEFT JOIN scopes reqScope ON reqRa.ScopeId = reqScope.ScopeId
     LEFT JOIN resources res ON r.resid = res.id
     WHERE r.requesterid = ?
     ORDER BY r.reqtime DESC
     LIMIT 5`,
    [user.id]
  );

  const userName = user.name ?? session.user.name ?? "Campus User";
  const userEmail = user.email ?? session.user.email ?? "";
  const userImage = user.image ?? session.user.image ?? "";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── 1. Top Executive Profile & Welcome Card ───────────────────── */}
      <div
        id="profile"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Identity & Contact Bar */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            {userImage ? (
              <div className="relative group shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <Image
                  src={userImage}
                  alt={userName}
                  className="relative rounded-2xl border-2 border-slate-700 shadow-xl object-cover"
                  width={80}
                  height={80}
                  priority
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-xl shadow-indigo-600/30 shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name, Email, Phone */}
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome back, <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">{userName}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{userEmail}</span>
                </span>
                {user.phno && (
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>+91 {user.phno}</span>
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                  Campus Account
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Roles & Responsibilities Section */}
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Current Roles & Responsibilities
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
              {activeAssignments.length} active
            </span>
          </div>

          {activeAssignments.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                No active role assignments found for this account.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Roles are assigned via department or institute databases.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeAssignments.map((a) => (
                <div
                  key={a.assignmentId}
                  className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {a.roleName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Active
                    </span>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <p className="text-slate-300 text-xs">
                      <span className="text-slate-500">Scope: </span>
                      <strong className="text-indigo-300 font-medium">{a.scopeName}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Active since: {formatDate(a.validFrom)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historical / Expired Roles (if any) */}
          {expiredAssignments.length > 0 && (
            <div className="pt-2 text-xs text-slate-500 border-t border-slate-800/60 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-400">Past assignments:</span>
              {expiredAssignments.map((a) => (
                <span
                  key={a.assignmentId}
                  className="px-2 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px]"
                >
                  {a.roleName} ({a.scopeName})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Metric Counter Strip (3 Columns) ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Active Roles */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Roles</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{activeAssignments.length}</div>
          <p className="text-[11px] text-slate-500">Authorized responsibilities in campus system</p>
        </div>

        {/* Metric 2: Pending Approvals */}
        <Link
          href="/dashboard/approvals"
          className={`p-5 rounded-2xl border backdrop-blur-sm space-y-1 transition-all group ${
            pendingApprovalsCount > 0
              ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
              : "bg-slate-900/80 border-slate-800/80 hover:border-slate-700/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${pendingApprovalsCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
              Pending Approvals
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${pendingApprovalsCount > 0 ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <span>{pendingApprovalsCount}</span>
            {pendingApprovalsCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 group-hover:text-indigo-400 transition-colors">
            {pendingApprovalsCount > 0 ? "Review requests awaiting your sign-off →" : "All queues cleared"}
          </p>
        </Link>

        {/* Metric 3: My Requests (Hyperlinks to My Requests tab) */}
        <Link
          href="/dashboard/requests?tab=my"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 backdrop-blur-sm space-y-1 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">My Requests</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{userStats.totalRequests}</div>
          <p className="text-[11px] text-slate-500 group-hover:text-indigo-400 transition-colors">
            {userStats.approvedRequests} approved • {userStats.pendingRequests} pending →
          </p>
        </Link>
      </div>

      {/* ── 3. Quick Action Shortcuts (4 Tiles) ────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Shortcuts
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/requests"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                Book Resource
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Submit allocation request with your role & scope
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/facilities"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                Browse Facilities
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Explore lecture halls, labs & auditoriums
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/approvals"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Approvals Queue
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Approve or reject requests under your authority
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/allocations"
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Allocations Grid
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Check confirmed schedules & conflict-free slots
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. Recent Requests Section ─────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Your Recent Requests
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Track the progress of your latest resource bookings
            </p>
          </div>
          <Link
            href="/dashboard/requests?tab=my"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <span>View all</span>
            <span>→</span>
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">No requests submitted yet</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a lecture hall, lab, or auditorium to submit your first request.
              </p>
            </div>
            <Link
              href="/dashboard/requests"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/20"
            >
              Create Booking Request
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((req) => (
              <div
                key={req.reqid}
                className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">
                      {req.resourceName ?? req.resid}
                    </span>
                    {req.resourceLocation && (
                      <span className="text-[11px] text-slate-400">
                        • {req.resourceLocation}
                      </span>
                    )}
                    {getStatusBadge(req.reqstatus)}
                  </div>

                  {req.purpose && (
                    <p className="text-xs text-slate-300 truncate max-w-xl">
                      {req.purpose}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                    <span>
                      Time: <strong className="text-slate-300 font-medium">{formatDateTime(req.starttime)} - {formatDateTime(req.endtime)}</strong>
                    </span>
                    {req.requesterRoleName && req.requesterScopeName && (
                      <span>
                        • As: <span className="text-indigo-400 font-medium">{req.requesterRoleName}</span> ({req.requesterScopeName})
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href="/dashboard/requests?tab=my"
                  className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors shrink-0 flex items-center gap-1 self-end sm:self-center"
                >
                  <span>Details</span>
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
