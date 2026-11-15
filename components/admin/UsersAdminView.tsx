"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import {
  deleteUserAction,
  assignRoleToUserAction,
  revokeRoleFromUserAction,
} from "@/actions/adminActions";

export interface UserRoleAssignmentDetail {
  assignmentId: number;
  userId: string;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
}

export interface AdminUserItem {
  id: string;
  name: string | null;
  email: string | null;
  phno: string | null;
  image: string | null;
  assignments: UserRoleAssignmentDetail[];
}

export interface OptionRole {
  roleId: string;
  roleName: string;
}

export interface OptionScope {
  scopeId: string;
  scopeName: string;
}

interface UsersAdminViewProps {
  initialUsers: AdminUserItem[];
  availableRoles: OptionRole[];
  availableScopes: OptionScope[];
  currentAdminUserId?: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Indefinite";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function UsersAdminView({
  initialUsers,
  availableRoles,
  availableScopes,
  currentAdminUserId,
}: UsersAdminViewProps) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "email" | "roles_desc">("name");

  // Assign Role Modal state
  const [targetUserForRole, setTargetUserForRole] = useState<AdminUserItem | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState(availableRoles[0]?.roleId || "");
  const [selectedScopeId, setSelectedScopeId] = useState(availableScopes[0]?.scopeId || "");
  const [validUntilDate, setValidUntilDate] = useState("");
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  // Delete User Modal state
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Filter & Sort
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // Role filter
        if (roleFilter !== "ALL") {
          const hasRole = u.assignments.some(
            (a) => a.isActive && a.roleId === roleFilter
          );
          if (!hasRole) return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = u.name ? u.name.toLowerCase().includes(q) : false;
          const matchesEmail = u.email ? u.email.toLowerCase().includes(q) : false;
          const matchesPhone = u.phno ? u.phno.includes(q) : false;
          const matchesRole = u.assignments.some(
            (a) =>
              a.roleName.toLowerCase().includes(q) ||
              a.scopeName.toLowerCase().includes(q)
          );
          return matchesName || matchesEmail || matchesPhone || matchesRole;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return (a.name || "").localeCompare(b.name || "");
        }
        if (sortBy === "email") {
          return (a.email || "").localeCompare(b.email || "");
        }
        if (sortBy === "roles_desc") {
          const aCount = a.assignments.filter((x) => x.isActive).length;
          const bCount = b.assignments.filter((x) => x.isActive).length;
          return bCount - aCount;
        }
        return 0;
      });
  }, [users, roleFilter, searchQuery, sortBy]);

  // Handle Assign Role submission
  const handleAssignRole = () => {
    if (!targetUserForRole) return;
    setRoleModalError(null);

    startTransition(async () => {
      const res = await assignRoleToUserAction(
        targetUserForRole.id,
        selectedRoleId,
        selectedScopeId,
        validUntilDate || null
      );

      if (!res.success) {
        setRoleModalError(res.error);
        return;
      }

      // Optimistically update local state
      const roleObj = availableRoles.find((r) => r.roleId === selectedRoleId);
      const scopeObj = availableScopes.find((s) => s.scopeId === selectedScopeId);

      const newAssignment: UserRoleAssignmentDetail = {
        assignmentId: Date.now(), // temporary
        userId: targetUserForRole.id,
        roleId: selectedRoleId,
        roleName: roleObj?.roleName || selectedRoleId,
        scopeId: selectedScopeId,
        scopeName: scopeObj?.scopeName || selectedScopeId,
        validFrom: new Date().toISOString(),
        validUntil: validUntilDate ? new Date(validUntilDate).toISOString() : null,
        isActive: true,
      };

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === targetUserForRole.id) {
            return {
              ...u,
              assignments: [newAssignment, ...u.assignments],
            };
          }
          return u;
        })
      );

      setTargetUserForRole(null);
      setValidUntilDate("");
    });
  };

  // Handle Revoke Role
  const handleRevokeRole = (userId: string, assignmentId: number) => {
    if (!confirm("Are you sure you want to revoke this role assignment?")) {
      return;
    }

    startTransition(async () => {
      const res = await revokeRoleFromUserAction(assignmentId);
      if (!res.success) {
        alert("Failed to revoke role: " + res.error);
        return;
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              assignments: u.assignments.map((a) =>
                a.assignmentId === assignmentId ? { ...a, isActive: false } : a
              ),
            };
          }
          return u;
        })
      );
    });
  };

  // Handle Delete User submission
  const handleDeleteUser = () => {
    if (!userToDelete) return;
    setDeleteModalError(null);

    startTransition(async () => {
      const res = await deleteUserAction(userToDelete.id);
      if (!res.success) {
        setDeleteModalError(res.error);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Counters ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Registered Users
          </span>
          <span className="text-2xl font-black text-white mt-1 block">
            {users.length}
          </span>
          <span className="text-[11px] text-slate-500">Total campus accounts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider block">
            Active Role Grants
          </span>
          <span className="text-2xl font-black text-indigo-300 mt-1 block">
            {users.reduce(
              (acc, u) => acc + u.assignments.filter((a) => a.isActive).length,
              0
            )}
          </span>
          <span className="text-[11px] text-slate-500">Live authorizations</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-purple-400 font-medium uppercase tracking-wider block">
            Available Roles
          </span>
          <span className="text-2xl font-black text-purple-300 mt-1 block">
            {availableRoles.length}
          </span>
          <span className="text-[11px] text-slate-500">Defined role titles</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider block">
            Jurisdiction Scopes
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {availableScopes.length}
          </span>
          <span className="text-[11px] text-slate-500">Dept, course, club scopes</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, email, phone, role title, or scope..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="name">Name (A-Z)</option>
              <option value="email">Email (A-Z)</option>
              <option value="roles_desc">Most Active Roles</option>
            </select>
          </div>
        </div>

        {/* Filter by Role */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
          <span className="text-xs text-slate-400 font-medium mr-1">Filter Role:</span>
          <button
            type="button"
            onClick={() => setRoleFilter("ALL")}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
              roleFilter === "ALL"
                ? "bg-slate-700 text-white"
                : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            All Roles
          </button>
          {availableRoles.map((r) => (
            <button
              key={r.roleId}
              type="button"
              onClick={() => setRoleFilter(r.roleId)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === r.roleId
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {r.roleName}
            </button>
          ))}
        </div>
      </div>

      {/* ── Users List / Cards ───────────────────────────────────────── */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-300">No matching users found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((u) => {
            const activeAssignments = u.assignments.filter((a) => a.isActive);
            const expiredAssignments = u.assignments.filter((a) => !a.isActive);
            const isSelf = u.id === currentAdminUserId;

            return (
              <div
                key={u.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/85 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-xl"
              >
                {/* User Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-4">
                    {u.image ? (
                      <Image
                        src={u.image}
                        alt={u.name || "User"}
                        width={48}
                        height={48}
                        className="rounded-2xl border border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-lg font-black text-white shadow-md">
                        {(u.name || u.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">
                          {u.name || "Unnamed User"}
                        </h3>
                        {isSelf && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                            You (Current Admin)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>{u.email}</span>
                        {u.phno && <span>• +91 {u.phno}</span>}
                        <span className="text-slate-500 font-mono text-[11px]">({u.id})</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetUserForRole(u);
                        setRoleModalError(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Assign Role</span>
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(u);
                          setDeleteModalError(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete User</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Assigned Roles List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Currently Assigned Roles ({activeAssignments.length})
                    </span>
                  </div>

                  {activeAssignments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-1">
                      No active roles assigned. Click &ldquo;Assign Role&rdquo; to add departmental or institutional authority.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {activeAssignments.map((a) => (
                        <div
                          key={a.assignmentId}
                          className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {a.roleName}
                            </span>
                            <span className="text-[11px] text-slate-300 block truncate">
                              Scope: <strong className="text-indigo-300 font-medium">{a.scopeName}</strong>
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Active: {formatDate(a.validFrom)} &rarr; {formatDate(a.validUntil)}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRevokeRole(u.id, a.assignmentId)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline shrink-0 font-medium py-0.5"
                            title="Revoke this role assignment"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Past / Expired roles list */}
                  {expiredAssignments.length > 0 && (
                    <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Past roles:</span>
                      {expiredAssignments.map((a) => (
                        <span
                          key={a.assignmentId}
                          className="px-2 py-0.5 rounded-lg bg-slate-950/40 border border-slate-850 text-slate-400"
                        >
                          {a.roleName} ({a.scopeName})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: Assign Role & Scope ───────────────────────────────── */}
      {targetUserForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Assign Role to User</h3>
                <p className="text-xs text-slate-400">
                  Target: <strong className="text-slate-200">{targetUserForRole.name || targetUserForRole.email}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetUserForRole(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {roleModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {roleModalError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Select Role</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {availableRoles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName} ({r.roleId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Select Scope</label>
                <select
                  value={selectedScopeId}
                  onChange={(e) => setSelectedScopeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {availableScopes.map((s) => (
                    <option key={s.scopeId} value={s.scopeId}>
                      {s.scopeName} ({s.scopeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Valid Until (Optional, leave blank for indefinite)
                </label>
                <input
                  type="date"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTargetUserForRole(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAssignRole}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                {isPending ? "Assigning..." : "Confirm Role Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete User Confirmation ──────────────────────────── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Delete User Account</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-white">{userToDelete.name || userToDelete.email}</strong>?
            </p>
            <p className="text-[11px] text-slate-400">
              This action will safely remove their role assignments and associated requests within a database transaction. This cannot be undone.
            </p>

            {deleteModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {deleteModalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md shadow-rose-600/30"
              >
                {isPending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

