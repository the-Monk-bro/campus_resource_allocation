"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
  ResourceFormData,
  HierarchyStepInput,
} from "@/actions/adminActions";
import {
  Building2,
  CheckCircle2,
  Wrench,
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  MapPin,
  GitCommit,
  AlertCircle,
  Tag,
  Shield,
  Loader2,
  ChevronDown,
} from "lucide-react";

export interface OptionRole {
  roleId: string;
  roleName: string;
}

export interface OptionScope {
  scopeId: string;
  scopeName: string;
}

export interface ResourceHierarchyItem {
  hid?: string;
  hlevel: number;
  roleId: string;
  roleName?: string;
  scopeId?: string | null;
  scopeName?: string | null;
}

export interface AdminResourceItem {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
  activeAllocations: number;
  totalRequests: number;
  hierarchies?: ResourceHierarchyItem[];
}

interface ResourcesAdminViewProps {
  initialResources: AdminResourceItem[];
  availableRoles: OptionRole[];
  availableScopes: OptionScope[];
}

const COMMON_RESOURCE_TYPES = [
  "Lecture Hall",
  "Computer Lab",
  "Auditorium",
  "Seminar Room",
  "Classroom",
  "Sports Arena",
  "Workshop",
];

export default function ResourcesAdminView({
  initialResources,
  availableRoles,
  availableScopes,
}: ResourcesAdminViewProps) {
  const [resources, setResources] = useState<AdminResourceItem[]>(initialResources);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "id" | "capacity_desc" | "capacity_asc">("name");

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newResource, setNewResource] = useState<ResourceFormData>({
    id: "",
    name: "",
    type: "Lecture Hall",
    capacity: 100,
    location: "",
    status: "AVAILABLE",
    hierarchies: [
      {
        hlevel: 1,
        roleId: availableRoles[0]?.roleId || "",
        scopeId: "",
      },
    ],
  });
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // Edit Modal state
  const [resourceToEdit, setResourceToEdit] = useState<AdminResourceItem | null>(null);
  const [editFormData, setEditFormData] = useState<ResourceFormData>({
    id: "",
    name: "",
    type: "",
    capacity: 0,
    location: "",
    status: "AVAILABLE",
    hierarchies: [],
  });
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Delete Modal state
  const [resourceToDelete, setResourceToDelete] = useState<AdminResourceItem | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Distinct types
  const types = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.type) set.add(r.type);
    });
    return Array.from(set).sort();
  }, [resources]);

  // Filter & Sort
  const filteredResources = useMemo(() => {
    return resources
      .filter((r) => {
        // Status filter
        if (statusFilter !== "ALL" && r.status !== statusFilter) {
          return false;
        }
        // Type filter
        if (typeFilter !== "ALL" && r.type !== typeFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = r.name.toLowerCase().includes(q);
          const matchesId = r.id.toLowerCase().includes(q);
          const matchesLocation = r.location ? r.location.toLowerCase().includes(q) : false;
          const matchesType = r.type ? r.type.toLowerCase().includes(q) : false;
          return matchesName || matchesId || matchesLocation || matchesType;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "id") {
          return a.id.localeCompare(b.id);
        }
        if (sortBy === "capacity_desc") {
          return (b.capacity || 0) - (a.capacity || 0);
        }
        if (sortBy === "capacity_asc") {
          return (a.capacity || 0) - (b.capacity || 0);
        }
        return 0;
      });
  }, [resources, statusFilter, typeFilter, searchQuery, sortBy]);

  // ── Hierarchy Helpers for Create Modal ──────────────────────────────
  const addCreateHierarchyStep = () => {
    setNewResource((prev) => ({
      ...prev,
      hierarchies: [
        ...(prev.hierarchies || []),
        {
          hlevel: (prev.hierarchies?.length || 0) + 1,
          roleId: availableRoles[0]?.roleId || "",
          scopeId: "",
        },
      ],
    }));
  };

  const removeCreateHierarchyStep = (indexToRemove: number) => {
    if ((newResource.hierarchies?.length || 0) <= 1) return;
    setNewResource((prev) => {
      const updated = (prev.hierarchies || [])
        .filter((_, idx) => idx !== indexToRemove)
        .map((item, idx) => ({ ...item, hlevel: idx + 1 }));
      return { ...prev, hierarchies: updated };
    });
  };

  const updateCreateHierarchyStep = (
    index: number,
    field: "roleId" | "scopeId",
    value: string
  ) => {
    setNewResource((prev) => {
      const updated = [...(prev.hierarchies || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, hierarchies: updated };
    });
  };

  // ── Hierarchy Helpers for Edit Modal ────────────────────────────────
  const addEditHierarchyStep = () => {
    setEditFormData((prev) => ({
      ...prev,
      hierarchies: [
        ...(prev.hierarchies || []),
        {
          hlevel: (prev.hierarchies?.length || 0) + 1,
          roleId: availableRoles[0]?.roleId || "",
          scopeId: "",
        },
      ],
    }));
  };

  const removeEditHierarchyStep = (indexToRemove: number) => {
    if ((editFormData.hierarchies?.length || 0) <= 1) return;
    setEditFormData((prev) => {
      const updated = (prev.hierarchies || [])
        .filter((_, idx) => idx !== indexToRemove)
        .map((item, idx) => ({ ...item, hlevel: idx + 1 }));
      return { ...prev, hierarchies: updated };
    });
  };

  const updateEditHierarchyStep = (
    index: number,
    field: "roleId" | "scopeId",
    value: string
  ) => {
    setEditFormData((prev) => {
      const updated = [...(prev.hierarchies || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, hierarchies: updated };
    });
  };

  // ── Form Submissions ────────────────────────────────────────────────
  const handleOpenCreateModal = () => {
    setNewResource({
      id: "",
      name: "",
      type: "Lecture Hall",
      capacity: 100,
      location: "",
      status: "AVAILABLE",
      hierarchies: [
        {
          hlevel: 1,
          roleId: availableRoles[0]?.roleId || "",
          scopeId: "",
        },
      ],
    });
    setCreateModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    // Validate approval hierarchy requirement
    const steps = newResource.hierarchies || [];
    if (steps.length === 0) {
      setCreateModalError("At least one approval hierarchy step is required.");
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].roleId || steps[i].roleId.trim() === "") {
        setCreateModalError(`Approver Role is mandatory for Level ${i + 1}.`);
        return;
      }
    }

    startTransition(async () => {
      const res = await createResourceAction(newResource);
      if (!res.success) {
        setCreateModalError(res.error);
        return;
      }

      const mappedHierarchies: ResourceHierarchyItem[] = steps.map((h) => ({
        hlevel: h.hlevel,
        roleId: h.roleId,
        roleName: availableRoles.find((r) => r.roleId === h.roleId)?.roleName || h.roleId,
        scopeId: h.scopeId && h.scopeId.trim() !== "" ? h.scopeId.trim() : null,
        scopeName:
          availableScopes.find((s) => s.scopeId === h.scopeId)?.scopeName ||
          (h.scopeId ? h.scopeId : "Any Scope"),
      }));

      setResources((prev) => [
        ...prev,
        {
          id: newResource.id.trim().toUpperCase(),
          name: newResource.name.trim(),
          type: newResource.type.trim(),
          capacity: Number(newResource.capacity),
          location: newResource.location.trim(),
          status: newResource.status,
          activeAllocations: 0,
          totalRequests: 0,
          hierarchies: mappedHierarchies,
        },
      ]);

      setIsCreateModalOpen(false);
    });
  };

  // Open Edit Modal
  const openEditModal = (item: AdminResourceItem) => {
    setResourceToEdit(item);
    const existingSteps: HierarchyStepInput[] =
      item.hierarchies && item.hierarchies.length > 0
        ? item.hierarchies.map((h) => ({
            hid: h.hid,
            hlevel: h.hlevel,
            roleId: h.roleId,
            scopeId: h.scopeId || "",
          }))
        : [
            {
              hlevel: 1,
              roleId: availableRoles[0]?.roleId || "",
              scopeId: "",
            },
          ];

    setEditFormData({
      id: item.id,
      name: item.name,
      type: item.type || "Lecture Hall",
      capacity: item.capacity || 50,
      location: item.location || "",
      status: item.status,
      hierarchies: existingSteps,
    });
    setEditModalError(null);
  };

  // Handle Edit Submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceToEdit) return;
    setEditModalError(null);

    const steps = editFormData.hierarchies || [];
    if (steps.length === 0) {
      setEditModalError("A resource must always have at least 1 approval hierarchy.");
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].roleId || steps[i].roleId.trim() === "") {
        setEditModalError(`Approver Role is mandatory for Level ${i + 1}.`);
        return;
      }
    }

    startTransition(async () => {
      const res = await updateResourceAction(editFormData);
      if (!res.success) {
        setEditModalError(res.error);
        return;
      }

      const mappedHierarchies: ResourceHierarchyItem[] = steps.map((h) => ({
        hid: h.hid,
        hlevel: h.hlevel,
        roleId: h.roleId,
        roleName: availableRoles.find((r) => r.roleId === h.roleId)?.roleName || h.roleId,
        scopeId: h.scopeId && h.scopeId.trim() !== "" ? h.scopeId.trim() : null,
        scopeName:
          availableScopes.find((s) => s.scopeId === h.scopeId)?.scopeName ||
          (h.scopeId ? h.scopeId : "Any Scope"),
      }));

      setResources((prev) =>
        prev.map((r) =>
          r.id === editFormData.id
            ? {
                ...r,
                name: editFormData.name,
                type: editFormData.type,
                capacity: Number(editFormData.capacity),
                location: editFormData.location,
                status: editFormData.status,
                hierarchies: mappedHierarchies,
              }
            : r
        )
      );

      setResourceToEdit(null);
    });
  };

  // Handle Delete Submission
  const handleDeleteSubmit = () => {
    if (!resourceToDelete) return;
    setDeleteModalError(null);

    startTransition(async () => {
      const res = await deleteResourceAction(resourceToDelete.id);
      if (!res.success) {
        setDeleteModalError(res.error);
        return;
      }

      setResources((prev) => prev.filter((r) => r.id !== resourceToDelete.id));
      setResourceToDelete(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Counters & Add Button ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <div className="saas-card p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Facilities
              </span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {resources.length}
            </span>
          </div>

          <div className="saas-card p-4">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Available
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {resources.filter((r) => r.status === "AVAILABLE").length}
            </span>
          </div>

          <div className="saas-card p-4">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Maintenance
              </span>
              <Wrench className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {resources.filter((r) => r.status === "MAINTENANCE").length}
            </span>
          </div>

          <div className="saas-card p-4">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Total Seating
              </span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-2xl font-black text-indigo-700 mt-1 block">
              {resources.reduce((acc, r) => acc + (r.capacity || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Space</span>
        </button>
      </div>

      {/* ── Filters & Search Toolbar ─────────────────────────────────── */}
      <div className="saas-card p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by facility name, ID, location, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600"
            >
              <option value="name">Sort by Name</option>
              <option value="id">Sort by Resource ID</option>
              <option value="capacity_desc">Capacity: High to Low</option>
              <option value="capacity_asc">Capacity: Low to High</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Type Filter:</span>
          <button
            type="button"
            onClick={() => setTypeFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              typeFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
            }`}
          >
            All Types ({resources.length})
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === t
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Resource Cards Grid ──────────────────────────────────────── */}
      {filteredResources.length === 0 ? (
        <div className="p-12 text-center saas-card space-y-3">
          <p className="text-sm font-semibold text-slate-800">No matching facilities found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="p-5 saas-card hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div className="space-y-3">
                {/* ID & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                    {res.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      res.status === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : res.status === "MAINTENANCE"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        res.status === "AVAILABLE"
                          ? "bg-emerald-500"
                          : res.status === "MAINTENANCE"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {res.status}
                  </span>
                </div>

                {/* Name, Type, Capacity */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {res.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {res.type && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {res.type}
                      </span>
                    )}
                    {res.capacity && (
                      <span className="text-xs text-slate-500">
                        • {res.capacity} Seats
                      </span>
                    )}
                  </div>
                </div>

                {res.location && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{res.location}</span>
                  </p>
                )}

                {/* Usage Counters */}
                <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span>Usage History</span>
                  <span className="text-slate-800 font-medium">
                    {res.activeAllocations} active • {res.totalRequests} requests
                  </span>
                </div>

                {/* Approval Pipeline Preview */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                      <GitCommit className="w-3.5 h-3.5" />
                      Approval Chain
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {res.hierarchies?.length || 0} stage{(res.hierarchies?.length || 0) === 1 ? "" : "s"}
                    </span>
                  </div>

                  {res.hierarchies && res.hierarchies.length > 0 ? (
                    <div className="space-y-1">
                      {res.hierarchies.map((h) => (
                        <div
                          key={h.hlevel}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px] shrink-0">
                              L{h.hlevel}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {h.roleName || h.roleId}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                            {h.scopeName || "(Any Scope)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-600 italic">No approval hierarchy configured</p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(res)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Facility</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResourceToDelete(res);
                    setDeleteModalError(null);
                  }}
                  className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: Create Resource ───────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Provision New Space & Approval Pipeline</h3>
                <p className="text-xs text-slate-500">Configure space specifications and required sequential sign-offs</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Resource ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LH-301, LAB-ROBOTICS"
                    value={newResource.id}
                    onChange={(e) => setNewResource({ ...newResource, id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture Hall 301"
                    value={newResource.name}
                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Facility Type <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="resource-type-suggestions"
                    placeholder="e.g. Lecture Hall, Computer Lab"
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  />
                  <datalist id="resource-type-suggestions">
                    {COMMON_RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Capacity (Seats) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newResource.capacity}
                    onChange={(e) => setNewResource({ ...newResource, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Location Details <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Academic POD-1D, 3rd Floor"
                    value={newResource.location}
                    onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Status</label>
                  <select
                    value={newResource.status}
                    onChange={(e) => setNewResource({ ...newResource, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                </div>
              </div>

              {/* ── Approval Hierarchy Pipeline Section ────────────── */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-slate-900 font-bold text-xs">
                      Approval Hierarchy Pipeline <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Sequential approval stages. Role is mandatory; Scope is optional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addCreateHierarchyStep}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Level</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(newResource.hierarchies || []).map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                          L{step.hlevel}
                        </span>
                        <span className="text-slate-600 text-[11px] font-medium sm:hidden">
                          Level {step.hlevel}
                        </span>
                      </div>

                      {/* Role Select (Mandatory) */}
                      <div className="flex-1">
                        <select
                          required
                          value={step.roleId}
                          onChange={(e) => updateCreateHierarchyStep(idx, "roleId", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                        >
                          <option value="" disabled>Select Role *</option>
                          {availableRoles.map((r) => (
                            <option key={r.roleId} value={r.roleId}>
                              {r.roleName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Scope Select (Optional) */}
                      <div className="flex-1">
                        <select
                          value={step.scopeId || ""}
                          onChange={(e) => updateCreateHierarchyStep(idx, "scopeId", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                        >
                          <option value="">(None / Any Scope)</option>
                          {availableScopes.map((s) => (
                            <option key={s.scopeId} value={s.scopeId}>
                              {s.scopeName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Delete Level Button */}
                      <button
                        type="button"
                        disabled={(newResource.hierarchies?.length || 0) <= 1}
                        onClick={() => removeCreateHierarchyStep(idx)}
                        title={
                          (newResource.hierarchies?.length || 0) <= 1
                            ? "A resource must have at least 1 approval hierarchy"
                            : "Remove this approval level"
                        }
                        className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
                          (newResource.hierarchies?.length || 0) <= 1
                            ? "opacity-30 cursor-not-allowed border-slate-200 text-slate-400"
                            : "text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-xs text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  {isPending ? "Creating..." : "Save Resource & Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Resource ─────────────────────────────────────── */}
      {resourceToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Facility & Approval Chain</h3>
                <span className="text-xs font-mono text-indigo-600">{editFormData.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setResourceToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Facility Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Type <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="resource-edit-type-suggestions"
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  />
                  <datalist id="resource-edit-type-suggestions">
                    {COMMON_RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Capacity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Location Details <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Operational Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 text-xs"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                </div>
              </div>

              {/* ── Approval Hierarchy Pipeline Section ────────────── */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-slate-900 font-bold text-xs">
                      Approval Hierarchy Pipeline <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Sequential approval stages. Role is mandatory; Scope is optional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addEditHierarchyStep}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Level</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(editFormData.hierarchies || []).map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                          L{step.hlevel}
                        </span>
                        <span className="text-slate-600 text-[11px] font-medium sm:hidden">
                          Level {step.hlevel}
                        </span>
                      </div>

                      {/* Role Select (Mandatory) */}
                      <div className="flex-1">
                        <select
                          required
                          value={step.roleId}
                          onChange={(e) => updateEditHierarchyStep(idx, "roleId", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                        >
                          <option value="" disabled>Select Role *</option>
                          {availableRoles.map((r) => (
                            <option key={r.roleId} value={r.roleId}>
                              {r.roleName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Scope Select (Optional) */}
                      <div className="flex-1">
                        <select
                          value={step.scopeId || ""}
                          onChange={(e) => updateEditHierarchyStep(idx, "scopeId", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                        >
                          <option value="">(None / Any Scope)</option>
                          {availableScopes.map((s) => (
                            <option key={s.scopeId} value={s.scopeId}>
                              {s.scopeName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Delete Level Button */}
                      <button
                        type="button"
                        disabled={(editFormData.hierarchies?.length || 0) <= 1}
                        onClick={() => removeEditHierarchyStep(idx)}
                        title={
                          (editFormData.hierarchies?.length || 0) <= 1
                            ? "A resource must always have at least 1 approval hierarchy"
                            : "Remove this approval level"
                        }
                        className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
                          (editFormData.hierarchies?.length || 0) <= 1
                            ? "opacity-30 cursor-not-allowed border-slate-200 text-slate-400"
                            : "text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResourceToEdit(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-xs text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  {isPending ? "Saving..." : "Update Resource & Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Resource ───────────────────────────────────── */}
      {resourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Facility</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete resource{" "}
              <strong className="text-slate-900">{resourceToDelete.name} ({resourceToDelete.id})</strong>?
            </p>
            <p className="text-[11px] text-slate-500">
              This will remove the facility, its approval hierarchy pipeline, and associated requests/allocations in a safe database transaction.
            </p>

            {deleteModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {deleteModalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResourceToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteSubmit}
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
