import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { UserRow } from "@/lib/types/db";
import { RowDataPacket } from "mysql2/promise";
import SignOutButton from "@/components/signOutButton";
import Image from "next/image";

interface UserAssignmentRow extends RowDataPacket {
  assignmentId: number;
  roleName: string;
  scopeName: string;
  scopeType: string;
  validFrom: Date;
  validUntil: Date | null;
  isActive: number; // 1 or 0
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  let user: UserRow | undefined = undefined;
  let assignments: UserAssignmentRow[] = [];

  if (session?.user?.email) {
    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, name, email, image, phno FROM users WHERE email = ? LIMIT 1`,
      [session.user.email]
    );
    user = userRows[0];

    if (user) {
      const [assignRows] = await pool.execute<UserAssignmentRow[]>(
        `SELECT
          ra.AssignmentId AS assignmentId,
          r.RoleName AS roleName,
          s.ScopeName AS scopeName,
          s.ScopeType AS scopeType,
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
      assignments = assignRows;
    }
  }

  const activeAssignments = assignments.filter((a) => Boolean(a.isActive));
  const expiredAssignments = assignments.filter((a) => !Boolean(a.isActive));

  const userName = user?.name ?? session?.user?.name ?? "User";
  const userEmail = user?.email ?? session?.user?.email ?? "";
  const userImage = user?.image ?? session?.user?.image ?? "";

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Profile Card Container */}
        <div className="relative bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6 overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
            <div>
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Campus Account
              </span>
            </div>
            <SignOutButton />
          </div>

          {/* User Info Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar */}
            {userImage ? (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <Image
                  src={userImage}
                  alt={userName}
                  className="relative rounded-full border-2 border-slate-700 shadow-xl object-cover"
                  width={88}
                  height={88}
                  priority
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name & Phone */}
            <div className="flex-1 space-y-1">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {userName}
              </h1>
              <p className="text-sm font-medium text-slate-400">
                {userEmail}
              </p>
              {user?.phno && (
                <p className="text-xs text-slate-500 pt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +91 {user.phno}
                </p>
              )}
            </div>
          </div>

          {/* Current Roles & Responsibilities Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Current Roles & Responsibilities
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {activeAssignments.length} active
              </span>
            </div>

            {activeAssignments.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-800/60 text-center">
                <p className="text-xs text-slate-400">
                  No active role assignments found for this account.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Contact an administrator to assign departmental, course, or club roles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeAssignments.map((a) => (
                  <div
                    key={a.assignmentId}
                    className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {a.roleName}
                      </h3>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="text-slate-300">
                        <span className="text-slate-500">Scope: </span>
                        <strong className="text-slate-200">{a.scopeName}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        <span className="text-slate-500">Active since: </span>
                        {formatDate(a.validFrom)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical / Expired Roles Section */}
          {expiredAssignments.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Past / Expired Assignments
                </h3>
                <span className="text-[11px] text-slate-500">
                  {expiredAssignments.length} expired
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 opacity-70">
                {expiredAssignments.map((a) => (
                  <div
                    key={a.assignmentId}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-300">{a.roleName}</span>
                      <span className="text-[10px] text-slate-500 uppercase">Expired</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Scope: {a.scopeName}
                    </p>
                    {a.validUntil && (
                      <p className="text-[10px] text-slate-500">
                        Ended on {formatDate(a.validUntil)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
