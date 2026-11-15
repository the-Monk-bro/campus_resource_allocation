"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import {
  deleteUserAction,
  assignRoleToUserAction,
  revokeRoleFromUserAction,
} from "@/actions/adminActions";
import {
  Users,
  ShieldCheck,
  Layers,
  Search,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  UserPlus,
  ShieldAlert,
  Inbox,
  Clock,
} from "lucide-react";

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
        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Registered Accounts
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {users.length}
          </span>
          <span className="text-[11px] text-slate-500">Total campus users</span>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Active Role Grants
            </span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">
            {users.reduce(
              (acc, u) => acc + u.assignments.filter((a) => a.isActive).length,
              0
            )}
          </span>
          <span className="text-[11px] text-slate-500">Live authorizations</span>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Defined Roles
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-purple-700 mt-1 block">
            {availableRoles.length}
          </span>
          <span className="text-[11px] text-slate-500">System roles</span>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Jurisdictions
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {availableScopes.length}
          </span>
          <span className="text-[11px] text-slate-500">Dept, club, centers</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="saas-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, email, phone, role title, or scope..."
              className="w-full pl-9 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
            >
              <option value="name">Name (A-Z)</option>
              <option value="email">Email (A-Z)</option>
              <option value="roles_desc">Most Active Roles</option>
            </select>
          </div>
        </div>

        {/* Filter by Role */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium mr-1">Filter Role:</span>
          <button
            type="button"
            onClick={() => setRoleFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
            }`}
          >
            All Roles
          </button>
          {availableRoles.map((r) => (
            <button
              key={r.roleId}
              type="button"
              onClick={() => setRoleFilter(r.roleId)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === r.roleId
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
              }`}
            >
              {r.roleName}
            </button>
          ))}
        </div>
      </div>

      {/* ── Users List / Cards ───────────────────────────────────────── */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center saas-card space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No matching users found</p>
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
                className="p-5 sm:p-6 saas-card hover:border-slate-300 transition-all space-y-4 shadow-xs"
              >
                {/* User Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    {u.image ? (
                      <Image
                        src={u.image}
                        alt={u.name || "User"}
                        width={44}
                        height={44}
                        className="rounded-xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-700">
                        {(u.name || u.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {u.name || "Unnamed User"}
                        </h3>
                        {isSelf && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                            Current Session Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {u.email}
                        </span>
                        {u.phno && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            +91 {u.phno}
                          </span>
                        )}
                        <span className="text-slate-400 font-mono text-[11px]">({u.id})</span>
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
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assign Role</span>
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(u);
                          setDeleteModalError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {a.roleName}
                            </span>
                            <span className="text-[11px] text-slate-600 block truncate">
                              Scope: <strong className="text-indigo-600 font-medium">{a.scopeName}</strong>
                            </span>
                            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Active: {formatDate(a.validFrom)} &rarr; {formatDate(a.validUntil)}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRevokeRole(u.id, a.assignmentId)}
                            className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline shrink-0 font-medium py-0.5 cursor-pointer"
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
                    <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Past roles:</span>
                      {expiredAssignments.map((a) => (
                        <span
                          key={a.assignmentId}
                          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Grant Role & Scope Authority</h3>
                <p className="text-xs text-slate-500">
                  Target Account: <strong className="text-slate-800">{targetUserForRole.name || targetUserForRole.email}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetUserForRole(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {roleModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{roleModalError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Select Role</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                >
                  {availableRoles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName} ({r.roleId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Select Scope</label>
                <select
                  value={selectedScopeId}
                  onChange={(e) => setSelectedScopeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                >
                  {availableScopes.map((s) => (
                    <option key={s.scopeId} value={s.scopeId}>
                      {s.scopeName} ({s.scopeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Valid Until (Optional, leave blank for indefinite)
                </label>
                <input
                  type="date"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTargetUserForRole(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAssignRole}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isPending ? "Assigning..." : "Confirm Role Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete User Confirmation ──────────────────────────── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">{userToDelete.name || userToDelete.email}</strong>?
            </p>
            <p className="text-[11px] text-slate-500">
              This action will safely remove their role assignments and associated requests within a database transaction. This cannot be undone.
            </p>

            {deleteModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {deleteModalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
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
