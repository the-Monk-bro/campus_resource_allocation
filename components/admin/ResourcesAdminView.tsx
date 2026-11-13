"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
  ResourceFormData,
} from "@/actions/adminActions";

export interface AdminResourceItem {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
  activeAllocations: number;
  totalRequests: number;
}

interface ResourcesAdminViewProps {
  initialResources: AdminResourceItem[];
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

export default function ResourcesAdminView({ initialResources }: ResourcesAdminViewProps) {
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

  // Handle Create Submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    startTransition(async () => {
      const res = await createResourceAction(newResource);
      if (!res.success) {
        setCreateModalError(res.error);
        return;
      }

      setResources((prev) => [
        ...prev,
        {
          ...newResource,
          capacity: Number(newResource.capacity),
          activeAllocations: 0,
          totalRequests: 0,
        },
      ]);

      setIsCreateModalOpen(false);
      setNewResource({
        id: "",
        name: "",
        type: "Lecture Hall",
        capacity: 100,
        location: "",
        status: "AVAILABLE",
      });
    });
  };

  // Open Edit Modal
  const openEditModal = (item: AdminResourceItem) => {
    setResourceToEdit(item);
    setEditFormData({
      id: item.id,
      name: item.name,
      type: item.type || "Lecture Hall",
      capacity: item.capacity || 50,
      location: item.location || "",
      status: item.status,
    });
    setEditModalError(null);
  };

  // Handle Edit Submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceToEdit) return;
    setEditModalError(null);

    startTransition(async () => {
      const res = await updateResourceAction(editFormData);
      if (!res.success) {
        setEditModalError(res.error);
        return;
      }

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
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
              Total Resources
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {resources.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider block">
              Available
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {resources.filter((r) => r.status === "AVAILABLE").length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-amber-400 font-medium uppercase tracking-wider block">
              In Maintenance
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">
              {resources.filter((r) => r.status === "MAINTENANCE").length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider block">
              Total Seating
            </span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">
              {resources.reduce((acc, r) => acc + (r.capacity || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsCreateModalOpen(true);
            setCreateModalError(null);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add New Resource</span>
        </button>
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
              placeholder="Search by facility name, ID (e.g. LH-101), location, or type..."
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
              <option value="id">Resource ID (A-Z)</option>
              <option value="capacity_desc">Capacity (Highest First)</option>
              <option value="capacity_asc">Capacity (Lowest First)</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
            {(["ALL", "AVAILABLE", "MAINTENANCE", "RETIRED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {st === "ALL" ? "All" : st}
              </button>
            ))}
          </div>

          {types.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">Category:</span>
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === "ALL"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                All
              </button>
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    typeFilter === t
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
      </div>

      {/* ── Resource Cards Grid ──────────────────────────────────────── */}
      {filteredResources.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-300">No matching resources found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="p-5 rounded-3xl bg-slate-900/85 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                {/* ID & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-indigo-400">
                    {res.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      res.status === "AVAILABLE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : res.status === "MAINTENANCE"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        res.status === "AVAILABLE"
                          ? "bg-emerald-400"
                          : res.status === "MAINTENANCE"
                          ? "bg-amber-400"
                          : "bg-slate-400"
                      }`}
                    />
                    {res.status}
                  </span>
                </div>

                {/* Name, Type, Capacity */}
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {res.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {res.type && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {res.type}
                      </span>
                    )}
                    {res.capacity && (
                      <span className="text-xs text-slate-400">
                        • {res.capacity} Seats
                      </span>
                    )}
                  </div>
                </div>

                {res.location && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{res.location}</span>
                  </p>
                )}

                <div className="text-[11px] text-slate-500 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span>Usage History</span>
                  <span className="text-slate-300 font-medium">
                    {res.activeAllocations} active • {res.totalRequests} requests
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => openEditModal(res)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResourceToDelete(res);
                    setDeleteModalError(null);
                  }}
                  className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: Create Resource ───────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add New Resource</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {createModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {createModalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Resource ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LH-301, LAB-ROBOTICS"
                    value={newResource.id}
                    onChange={(e) => setNewResource({ ...newResource, id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Facility Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture Hall 301"
                    value={newResource.name}
                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Facility Type</label>
                  <input
                    type="text"
                    required
                    list="resource-type-suggestions"
                    placeholder="e.g. Lecture Hall, Computer Lab"
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <datalist id="resource-type-suggestions">
                    {COMMON_RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newResource.capacity}
                    onChange={(e) => setNewResource({ ...newResource, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Location Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Academic POD-1D, 3rd Floor"
                  value={newResource.location}
                  onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Status</label>
                <select
                  value={newResource.status}
                  onChange={(e) => setNewResource({ ...newResource, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/30"
                >
                  {isPending ? "Creating..." : "Save Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Resource ─────────────────────────────────────── */}
      {resourceToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Facility Details</h3>
                <span className="text-xs font-mono text-indigo-400">{editFormData.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setResourceToEdit(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {editModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editModalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type</label>
                  <input
                    type="text"
                    required
                    list="resource-edit-type-suggestions"
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <datalist id="resource-edit-type-suggestions">
                    {COMMON_RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Location Details</label>
                <input
                  type="text"
                  required
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Operational Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResourceToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/30"
                >
                  {isPending ? "Saving..." : "Update Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Resource ───────────────────────────────────── */}
      {resourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Delete Facility</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete resource{" "}
              <strong className="text-white">{resourceToDelete.name} ({resourceToDelete.id})</strong>?
            </p>
            <p className="text-[11px] text-slate-400">
              This will remove the facility, its approval hierarchy pipeline, and associated requests/allocations in a safe database transaction.
            </p>

            {deleteModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {deleteModalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResourceToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteSubmit}
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

