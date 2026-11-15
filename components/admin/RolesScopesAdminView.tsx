"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  createScopeAction,
  updateScopeAction,
  deleteScopeAction,
  RoleFormData,
  ScopeFormData,
} from "@/actions/adminActions";

export interface AdminRoleItem {
  roleId: string;
  roleName: string;
  assignmentCount: number;
  hierarchyCount: number;
}

export interface AdminScopeItem {
  scopeId: string;
  scopeName: string;
  scopeType: string;
  assignmentCount: number;
  hierarchyCount: number;
}

interface RolesScopesAdminViewProps {
  initialRoles: AdminRoleItem[];
  initialScopes: AdminScopeItem[];
}

const COMMON_SCOPE_TYPES = [
  "DEPARTMENT",
  "CLUB",
  "INSTITUTE",
  "COURSE",
  "CENTER",
  "ADMINISTRATIVE",
];

export default function RolesScopesAdminView({
  initialRoles,
  initialScopes,
}: RolesScopesAdminViewProps) {
  const [roles, setRoles] = useState<AdminRoleItem[]>(initialRoles);
  const [scopes, setScopes] = useState<AdminScopeItem[]>(initialScopes);

  const [activeTab, setActiveTab] = useState<"ROLES" | "SCOPES">("ROLES");
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeTypeFilter, setScopeTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "id" | "usage">("name");

  // Role Modals
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<RoleFormData>({ roleId: "", roleName: "" });
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);

  const [roleToEdit, setRoleToEdit] = useState<AdminRoleItem | null>(null);
  const [editRoleForm, setEditRoleForm] = useState<RoleFormData>({ roleId: "", roleName: "" });
  const [editRoleError, setEditRoleError] = useState<string | null>(null);

  const [roleToDelete, setRoleToDelete] = useState<AdminRoleItem | null>(null);
  const [deleteRoleError, setDeleteRoleError] = useState<string | null>(null);

  // Scope Modals
  const [isCreateScopeOpen, setIsCreateScopeOpen] = useState(false);
  const [newScope, setNewScope] = useState<ScopeFormData>({
    scopeId: "",
    scopeName: "",
    scopeType: "DEPARTMENT",
  });
  const [createScopeError, setCreateScopeError] = useState<string | null>(null);

  const [scopeToEdit, setScopeToEdit] = useState<AdminScopeItem | null>(null);
  const [editScopeForm, setEditScopeForm] = useState<ScopeFormData>({
    scopeId: "",
    scopeName: "",
    scopeType: "DEPARTMENT",
  });
  const [editScopeError, setEditScopeError] = useState<string | null>(null);

  const [scopeToDelete, setScopeToDelete] = useState<AdminScopeItem | null>(null);
  const [deleteScopeError, setDeleteScopeError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Distinct Scope Types
  const distinctScopeTypes = useMemo(() => {
    const s = new Set<string>();
    scopes.forEach((sc) => {
      if (sc.scopeType) s.add(sc.scopeType);
    });
    return Array.from(s).sort();
  }, [scopes]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return r.roleName.toLowerCase().includes(q) || r.roleId.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.roleName.localeCompare(b.roleName);
        if (sortBy === "id") return a.roleId.localeCompare(b.roleId);
        if (sortBy === "usage") {
          return (b.assignmentCount + b.hierarchyCount) - (a.assignmentCount + a.hierarchyCount);
        }
        return 0;
      });
  }, [roles, searchQuery, sortBy]);

  // Filtered Scopes
  const filteredScopes = useMemo(() => {
    return scopes
      .filter((s) => {
        if (scopeTypeFilter !== "ALL" && s.scopeType !== scopeTypeFilter) {
          return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          s.scopeName.toLowerCase().includes(q) ||
          s.scopeId.toLowerCase().includes(q) ||
          s.scopeType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.scopeName.localeCompare(b.scopeName);
        if (sortBy === "id") return a.scopeId.localeCompare(b.scopeId);
        if (sortBy === "usage") {
          return (b.assignmentCount + b.hierarchyCount) - (a.assignmentCount + a.hierarchyCount);
        }
        return 0;
      });
  }, [scopes, scopeTypeFilter, searchQuery, sortBy]);

  // ── Role Handlers ───────────────────────────────────────────────────
  const handleOpenCreateRole = () => {
    setNewRole({ roleId: "", roleName: "" });
    setCreateRoleError(null);
    setIsCreateRoleOpen(true);
  };

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRoleError(null);

    startTransition(async () => {
      const res = await createRoleAction(newRole);
      if (!res.success) {
        setCreateRoleError(res.error);
        return;
      }

      let finalId = newRole.roleId.trim().toUpperCase();
      if (!finalId.startsWith("ROLE-")) finalId = `ROLE-${finalId}`;

      setRoles((prev) => [
        ...prev,
        {
          roleId: finalId,
          roleName: newRole.roleName.trim(),
          assignmentCount: 0,
          hierarchyCount: 0,
        },
      ]);
      setIsCreateRoleOpen(false);
    });
  };

  const handleOpenEditRole = (role: AdminRoleItem) => {
    setRoleToEdit(role);
    setEditRoleForm({
      roleId: role.roleId,
      roleName: role.roleName,
    });
    setEditRoleError(null);
  };

  const handleEditRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleToEdit) return;
    setEditRoleError(null);

    startTransition(async () => {
      const res = await updateRoleAction(editRoleForm);
      if (!res.success) {
        setEditRoleError(res.error);
        return;
      }

      setRoles((prev) =>
        prev.map((r) =>
          r.roleId === editRoleForm.roleId ? { ...r, roleName: editRoleForm.roleName.trim() } : r
        )
      );
      setRoleToEdit(null);
    });
  };

  const handleDeleteRoleSubmit = () => {
    if (!roleToDelete) return;
    setDeleteRoleError(null);

    startTransition(async () => {
      const res = await deleteRoleAction(roleToDelete.roleId);
      if (!res.success) {
        setDeleteRoleError(res.error);
        return;
      }

      setRoles((prev) => prev.filter((r) => r.roleId !== roleToDelete.roleId));
      setRoleToDelete(null);
    });
  };

  // ── Scope Handlers ──────────────────────────────────────────────────
  const handleOpenCreateScope = () => {
    setNewScope({ scopeId: "", scopeName: "", scopeType: "DEPARTMENT" });
    setCreateScopeError(null);
    setIsCreateScopeOpen(true);
  };

  const handleCreateScopeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateScopeError(null);

    startTransition(async () => {
      const res = await createScopeAction(newScope);
      if (!res.success) {
        setCreateScopeError(res.error);
        return;
      }

      let finalId = newScope.scopeId.trim().toUpperCase();
      if (!finalId.startsWith("SCOPE-")) finalId = `SCOPE-${finalId}`;

      setScopes((prev) => [
        ...prev,
        {
          scopeId: finalId,
          scopeName: newScope.scopeName.trim(),
          scopeType: (newScope.scopeType.trim() || "DEPARTMENT").toUpperCase(),
          assignmentCount: 0,
          hierarchyCount: 0,
        },
      ]);
      setIsCreateScopeOpen(false);
    });
  };

  const handleOpenEditScope = (scope: AdminScopeItem) => {
    setScopeToEdit(scope);
    setEditScopeForm({
      scopeId: scope.scopeId,
      scopeName: scope.scopeName,
      scopeType: scope.scopeType,
    });
    setEditScopeError(null);
  };

  const handleEditScopeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopeToEdit) return;
    setEditScopeError(null);

    startTransition(async () => {
      const res = await updateScopeAction(editScopeForm);
      if (!res.success) {
        setEditScopeError(res.error);
        return;
      }

      setScopes((prev) =>
        prev.map((s) =>
          s.scopeId === editScopeForm.scopeId
            ? {
                ...s,
                scopeName: editScopeForm.scopeName.trim(),
                scopeType: editScopeForm.scopeType.trim().toUpperCase(),
              }
            : s
        )
      );
      setScopeToEdit(null);
    });
  };

  const handleDeleteScopeSubmit = () => {
    if (!scopeToDelete) return;
    setDeleteScopeError(null);

    startTransition(async () => {
      const res = await deleteScopeAction(scopeToDelete.scopeId);
      if (!res.success) {
        setDeleteScopeError(res.error);
        return;
      }

      setScopes((prev) => prev.filter((s) => s.scopeId !== scopeToDelete.scopeId));
      setScopeToDelete(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Counters & Action Buttons ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
              Total Roles
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {roles.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-purple-400 font-medium uppercase tracking-wider block">
              Total Scopes
            </span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">
              {scopes.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider block">
              Active User Roles
            </span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">
              {roles.reduce((acc, r) => acc + r.assignmentCount, 0)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider block">
              Approval Linkages
            </span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">
              {roles.reduce((acc, r) => acc + r.hierarchyCount, 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreateRole}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add Role</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateScope}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add Scope</span>
          </button>
        </div>
      </div>

      {/* ── Tab Switcher & Search Toolbar ────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Segmented Toggle */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("ROLES")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "ROLES"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>System Roles</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === "ROLES" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}>
                {roles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SCOPES")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "SCOPES"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Institutional Scopes</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === "SCOPES" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}>
                {scopes.length}
              </span>
            </button>
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={
                  activeTab === "ROLES"
                    ? "Search roles by name or ID..."
                    : "Search scopes by name, ID, or type..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 shrink-0"
            >
              <option value="name">Sort by Name</option>
              <option value="id">Sort by ID</option>
              <option value="usage">Sort by Total Usage</option>
            </select>
          </div>
        </div>

        {/* Scope Type Filter (shown only when Scopes tab is active) */}
        {activeTab === "SCOPES" && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Type Filter:</span>
            <button
              type="button"
              onClick={() => setScopeTypeFilter("ALL")}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                scopeTypeFilter === "ALL"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              All Types ({scopes.length})
            </button>
            {distinctScopeTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setScopeTypeFilter(t)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  scopeTypeFilter === t
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB CONTENT: Roles ───────────────────────────────────────── */}
      {activeTab === "ROLES" && (
        <div>
          {filteredRoles.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <p className="text-sm font-semibold text-slate-300">No matching roles found</p>
              <p className="text-xs text-slate-500">Try adjusting your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((role) => {
                const isSystemProtected =
                  role.roleId === "ROLE-ADMIN" || role.roleName.toLowerCase() === "admin";

                return (
                  <div
                    key={role.roleId}
                    className="p-5 rounded-3xl bg-slate-900/85 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-indigo-400">
                          {role.roleId}
                        </span>

                        {isSystemProtected ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                            System Core
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold">
                            Role
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {role.roleName}
                        </h3>
                      </div>

                      {/* Usage Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/60">
                        <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                            Assigned Users
                          </span>
                          <span className="text-sm font-black text-slate-200 mt-0.5 block">
                            {role.assignmentCount}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                            Approval Chains
                          </span>
                          <span className="text-sm font-black text-purple-300 mt-0.5 block">
                            {role.hierarchyCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(role)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSystemProtected}
                        onClick={() => {
                          setRoleToDelete(role);
                          setDeleteRoleError(null);
                        }}
                        title={isSystemProtected ? "Primary system Admin role cannot be deleted" : "Delete role"}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          isSystemProtected
                            ? "opacity-30 cursor-not-allowed border-slate-800 text-slate-600"
                            : "bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20 cursor-pointer"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: Scopes ──────────────────────────────────────── */}
      {activeTab === "SCOPES" && (
        <div>
          {filteredScopes.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <p className="text-sm font-semibold text-slate-300">No matching scopes found</p>
              <p className="text-xs text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScopes.map((scope) => {
                const isSystemProtected =
                  scope.scopeId === "SCOPE-CRAS" || scope.scopeName.toLowerCase() === "cras";

                return (
                  <div
                    key={scope.scopeId}
                    className="p-5 rounded-3xl bg-slate-900/85 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-purple-400">
                          {scope.scopeId}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isSystemProtected && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                              Core Scope
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold uppercase">
                            {scope.scopeType}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {scope.scopeName}
                        </h3>
                      </div>

                      {/* Usage Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/60">
                        <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                            Assigned Users
                          </span>
                          <span className="text-sm font-black text-slate-200 mt-0.5 block">
                            {scope.assignmentCount}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                            Approval Chains
                          </span>
                          <span className="text-sm font-black text-purple-300 mt-0.5 block">
                            {scope.hierarchyCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleOpenEditScope(scope)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSystemProtected}
                        onClick={() => {
                          setScopeToDelete(scope);
                          setDeleteScopeError(null);
                        }}
                        title={isSystemProtected ? "Primary CRAS scope cannot be deleted" : "Delete scope"}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          isSystemProtected
                            ? "opacity-30 cursor-not-allowed border-slate-800 text-slate-600"
                            : "bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20 cursor-pointer"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: Create Role ───────────────────────────────────────── */}
      {isCreateRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create System Role</h3>
              <button
                type="button"
                onClick={() => setIsCreateRoleOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createRoleError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {createRoleError}
              </div>
            )}

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Role Identifier <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-500 text-xs select-none">
                    ROLE-
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="DEAN, WARDEN, ADVISOR"
                    value={newRole.roleId.replace(/^ROLE-/, "")}
                    onChange={(e) =>
                      setNewRole({ ...newRole, roleId: `ROLE-${e.target.value.toUpperCase()}` })
                    }
                    className="w-full pl-16 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-mono uppercase"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Unique machine-readable key (auto-prefixed with ROLE-)</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Role Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Associate Dean of Academic Affairs"
                  value={newRole.roleName}
                  onChange={(e) => setNewRole({ ...newRole, roleName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {isPending ? "Creating..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Role ─────────────────────────────────────────── */}
      {roleToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Edit Role Details</h3>
                <span className="text-xs font-mono text-indigo-400">{editRoleForm.roleId}</span>
              </div>
              <button
                type="button"
                onClick={() => setRoleToEdit(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editRoleError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editRoleError}
              </div>
            )}

            <form onSubmit={handleEditRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role Display Name</label>
                <input
                  type="text"
                  required
                  value={editRoleForm.roleName}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, roleName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {isPending ? "Saving..." : "Update Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Role ───────────────────────────────────────── */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Delete Role</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete role{" "}
              <strong className="text-white">{roleToDelete.roleName} ({roleToDelete.roleId})</strong>?
            </p>

            {(roleToDelete.assignmentCount > 0 || roleToDelete.hierarchyCount > 0) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                <p className="font-bold">⚠️ Warning: Role in Active Use</p>
                <p>
                  This role is currently assigned to <strong>{roleToDelete.assignmentCount}</strong> user(s) and referenced in <strong>{roleToDelete.hierarchyCount}</strong> approval chain(s). You must revoke these assignments and reassign approval chains before deletion can proceed.
                </p>
              </div>
            )}

            {deleteRoleError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {deleteRoleError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || roleToDelete.assignmentCount > 0 || roleToDelete.hierarchyCount > 0}
                onClick={handleDeleteRoleSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                {isPending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create Scope ──────────────────────────────────────── */}
      {isCreateScopeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Institutional Scope</h3>
              <button
                type="button"
                onClick={() => setIsCreateScopeOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createScopeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {createScopeError}
              </div>
            )}

            <form onSubmit={handleCreateScopeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Scope Identifier <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-500 text-xs select-none">
                    SCOPE-
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="AI-RESEARCH, ROBOTICS, LIBRARY"
                    value={newScope.scopeId.replace(/^SCOPE-/, "")}
                    onChange={(e) =>
                      setNewScope({ ...newScope, scopeId: `SCOPE-${e.target.value.toUpperCase()}` })
                    }
                    className="w-full pl-18 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-mono uppercase"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Unique machine-readable key (auto-prefixed with SCOPE-)</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Scope Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence Research Center"
                  value={newScope.scopeName}
                  onChange={(e) => setNewScope({ ...newScope, scopeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Scope Category / Type <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="scope-type-options"
                  placeholder="e.g. DEPARTMENT, CLUB, INSTITUTE, COURSE"
                  value={newScope.scopeType}
                  onChange={(e) => setNewScope({ ...newScope, scopeType: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs uppercase"
                />
                <datalist id="scope-type-options">
                  {COMMON_SCOPE_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateScopeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  {isPending ? "Creating..." : "Save Scope"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Scope ─────────────────────────────────────────── */}
      {scopeToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Edit Scope Details</h3>
                <span className="text-xs font-mono text-purple-400">{editScopeForm.scopeId}</span>
              </div>
              <button
                type="button"
                onClick={() => setScopeToEdit(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editScopeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editScopeError}
              </div>
            )}

            <form onSubmit={handleEditScopeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Scope Display Name</label>
                <input
                  type="text"
                  required
                  value={editScopeForm.scopeName}
                  onChange={(e) => setEditScopeForm({ ...editScopeForm, scopeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Scope Type / Category</label>
                <input
                  type="text"
                  required
                  list="scope-edit-type-options"
                  value={editScopeForm.scopeType}
                  onChange={(e) => setEditScopeForm({ ...editScopeForm, scopeType: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs uppercase"
                />
                <datalist id="scope-edit-type-options">
                  {COMMON_SCOPE_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setScopeToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  {isPending ? "Saving..." : "Update Scope"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Scope ───────────────────────────────────────── */}
      {scopeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Delete Scope</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete scope{" "}
              <strong className="text-white">{scopeToDelete.scopeName} ({scopeToDelete.scopeId})</strong>?
            </p>

            {(scopeToDelete.assignmentCount > 0 || scopeToDelete.hierarchyCount > 0) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                <p className="font-bold">⚠️ Warning: Scope in Active Use</p>
                <p>
                  This scope is currently assigned to <strong>{scopeToDelete.assignmentCount}</strong> user role(s) and referenced in <strong>{scopeToDelete.hierarchyCount}</strong> resource approval chain(s). You must revoke these assignments and reassign approval chains before deletion can proceed.
                </p>
              </div>
            )}

            {deleteScopeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {deleteScopeError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setScopeToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || scopeToDelete.assignmentCount > 0 || scopeToDelete.hierarchyCount > 0}
                onClick={handleDeleteScopeSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
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

