import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { UserRow } from "@/lib/types/db";
import { RowDataPacket } from "mysql2/promise";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getMyPendingApprovalsAction } from "@/actions/approvalActions";
import {
  Mail,
  Phone,
  Building2,
  CalendarPlus,
  CheckSquare2,
  CalendarRange,
  ArrowRight,
  Clock,
  ShieldCheck,
  MapPin,
  Sparkles,
} from "lucide-react";

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Approved
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Rejected
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
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
    redirect("/api/auth/signout");
  }

  // 2. Fetch role assignments
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
  const pendingApprovalsCount = pendingApprovalsRes.success
    ? pendingApprovalsRes.items.length
    : 0;

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
  const userStats = statsRows[0] || {
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
  };

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── 1. Top Executive Profile & Welcome Card ───────────────────── */}
      <div className="saas-card p-6 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                className="rounded-xl border border-slate-200 object-cover shadow-xs shrink-0"
                width={64}
                height={64}
                priority
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name, Email, Phone */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {userName}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                  Active Member
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{userEmail}</span>
                </span>
                {user.phno && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>+91 {user.phno}</span>
                  </span>
                )}
                <span className="text-slate-400">&middot;</span>
                <span className="text-slate-600 font-medium">IIT Indore</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/requests"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>New Booking</span>
            </Link>
          </div>
        </div>

        {/* Roles & Responsibilities Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Assigned Roles &amp; Department Scopes
              </h2>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {activeAssignments.length} active
            </span>
          </div>

          {activeAssignments.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
              No active role assignments found for this account.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeAssignments.map((a) => (
                <div
                  key={a.assignmentId}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {a.roleName}
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium shrink-0">
                      Active
                    </span>
                  </div>

                  <div className="space-y-0.5 text-xs text-slate-600">
                    <p>
                      <span className="text-slate-400">Scope: </span>
                      <strong className="text-slate-800 font-medium">
                        {a.scopeName}
                      </strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Since {formatDate(a.validFrom)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {expiredAssignments.length > 0 && (
            <div className="pt-2 text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-400">Past roles:</span>
              {expiredAssignments.map((a) => (
                <span
                  key={a.assignmentId}
                  className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-500 text-[11px]"
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
        <div className="saas-card p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Roles
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {activeAssignments.length}
          </div>
          <p className="text-xs text-slate-500">
            Authorized responsibilities across campus
          </p>
        </div>

        {/* Metric 2: Pending Approvals */}
        <Link
          href="/dashboard/approvals"
          className={`saas-card p-5 space-y-1 transition-all ${
            pendingApprovalsCount > 0
              ? "border-amber-300 bg-amber-50/30 hover:border-amber-400"
              : "hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                pendingApprovalsCount > 0 ? "text-amber-800" : ""
              }`}
            >
              Pending Approvals
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                pendingApprovalsCount > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <CheckSquare2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>{pendingApprovalsCount}</span>
            {pendingApprovalsCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                Action Required
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {pendingApprovalsCount > 0
              ? "Review requests awaiting your sign-off &rarr;"
              : "All approval queues cleared"}
          </p>
        </Link>

        {/* Metric 3: My Requests */}
        <Link
          href="/dashboard/requests?tab=my"
          className="saas-card p-5 space-y-1 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              My Requests
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {userStats.totalRequests}
          </div>
          <p className="text-xs text-slate-500">
            {userStats.approvedRequests} approved &middot; {userStats.pendingRequests} pending &rarr;
          </p>
        </Link>
      </div>

      {/* ── 3. Quick Action Shortcuts (4 Tiles) ────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Quick Shortcuts
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/requests"
            className="saas-card p-4 hover:border-indigo-300 hover:shadow-sm transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Book Resource
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit request with role &amp; scope
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/facilities"
            className="saas-card p-4 hover:border-indigo-300 hover:shadow-sm transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Facilities Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Explore campus capacity &amp; specs
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/approvals"
            className="saas-card p-4 hover:border-indigo-300 hover:shadow-sm transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CheckSquare2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                Review Approvals
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clear pending tier sign-offs
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/allocations"
            className="saas-card p-4 hover:border-indigo-300 hover:shadow-sm transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
                Allocations Schedule
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                View confirmed calendar bookings
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. Recent Requests Table ───────────────────────────────────── */}
      <div className="saas-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900">
              My Recent Bookings
            </h3>
            <p className="text-xs text-slate-500">
              Latest reservation requests submitted from your account
            </p>
          </div>
          <Link
            href="/dashboard/requests?tab=my"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
            <Clock className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-medium text-slate-600">
              You haven&apos;t submitted any resource allocation requests yet.
            </p>
            <Link
              href="/dashboard/requests"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <span>Submit your first booking request</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Request ID</th>
                  <th className="px-4 py-2.5">Resource &amp; Purpose</th>
                  <th className="px-4 py-2.5">Acting As</th>
                  <th className="px-4 py-2.5">Time Window</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentRequests.map((req) => (
                  <tr key={req.reqid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-600">
                      #{req.reqid}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {req.resourceName ?? req.resid}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {req.purpose || "No purpose specified"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium">
                        {req.requesterRoleName ?? "Member"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {req.requesterScopeName ?? "Campus"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{formatDateTime(req.starttime)}</div>
                      <div className="text-[11px] text-slate-400">
                        to {formatDateTime(req.endtime)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(req.reqstatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
