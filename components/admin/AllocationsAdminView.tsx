"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface AdminAllocationItem {
  allocationid: number;
  allocationstatus: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  reqid: number;
  purpose: string | null;
  starttime: string;
  endtime: string;
  reqstatus: string;
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  resourceId: string;
  resourceName: string | null;
  resourceType: string | null;
  resourceLocation: string | null;
  requesterRoleName: string | null;
  requesterScopeName: string | null;
}

interface AllocationsAdminViewProps {
  initialAllocations: AdminAllocationItem[];
}

function formatDateTime(dateStr: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getAllocationStatusBadge(status: string) {
  switch (status) {
    case "SCHEDULED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Scheduled
        </span>
      );
    case "ONGOING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Ongoing
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Completed
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
          {status}
        </span>
      );
  }
}

export default function AllocationsAdminView({ initialAllocations }: AllocationsAdminViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"time_desc" | "time_asc" | "resource" | "requester">("time_desc");

  // Distinct resource types
  const resourceTypes = useMemo(() => {
    const set = new Set<string>();
    initialAllocations.forEach((a) => {
      if (a.resourceType) set.add(a.resourceType);
    });
    return Array.from(set).sort();
  }, [initialAllocations]);

  // Filter & Sort
  const filteredAllocations = useMemo(() => {
    return initialAllocations
      .filter((a) => {
        // Status filter
        if (statusFilter !== "ALL" && a.allocationstatus !== statusFilter) {
          return false;
        }
        // Resource type filter
        if (typeFilter !== "ALL" && a.resourceType !== typeFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesResource =
            (a.resourceName && a.resourceName.toLowerCase().includes(q)) ||
            a.resourceId.toLowerCase().includes(q) ||
            (a.resourceLocation && a.resourceLocation.toLowerCase().includes(q));
          const matchesUser =
            (a.requesterName && a.requesterName.toLowerCase().includes(q)) ||
            (a.requesterEmail && a.requesterEmail.toLowerCase().includes(q));
          const matchesPurpose = a.purpose ? a.purpose.toLowerCase().includes(q) : false;
          return matchesResource || matchesUser || matchesPurpose;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "time_desc") {
          return new Date(b.starttime).getTime() - new Date(a.starttime).getTime();
        }
        if (sortBy === "time_asc") {
          return new Date(a.starttime).getTime() - new Date(b.starttime).getTime();
        }
        if (sortBy === "resource") {
          return (a.resourceName || a.resourceId).localeCompare(b.resourceName || b.resourceId);
        }
        if (sortBy === "requester") {
          return (a.requesterName || "").localeCompare(b.requesterName || "");
        }
        return 0;
      });
  }, [initialAllocations, statusFilter, typeFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* ── Summary Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Total Allocations
          </span>
          <span className="text-2xl font-black text-white mt-1 block">
            {initialAllocations.length}
          </span>
          <span className="text-[11px] text-slate-500">Across all resources</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider block">
            Scheduled
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {initialAllocations.filter((a) => a.allocationstatus === "SCHEDULED").length}
          </span>
          <span className="text-[11px] text-slate-500">Upcoming confirmed slots</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider block">
            Ongoing / Active
          </span>
          <span className="text-2xl font-black text-indigo-300 mt-1 block">
            {initialAllocations.filter((a) => a.allocationstatus === "ONGOING").length}
          </span>
          <span className="text-[11px] text-slate-500">Currently in progress</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Completed
          </span>
          <span className="text-2xl font-black text-slate-300 mt-1 block">
            {initialAllocations.filter((a) => a.allocationstatus === "COMPLETED").length}
          </span>
          <span className="text-[11px] text-slate-500">Historical slots</span>
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
              placeholder="Search by facility, location, requester name, or purpose..."
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
              <option value="time_desc">Booking Start (Newest First)</option>
              <option value="time_asc">Booking Start (Oldest First)</option>
              <option value="resource">Resource Name (A-Z)</option>
              <option value="requester">Requester Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
            {(["ALL", "SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"] as const).map((st) => (
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

          {/* Type Filters */}
          {resourceTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">Type:</span>
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
              {resourceTypes.map((t) => (
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

      {/* ── Allocations Table / Card List ────────────────────────────── */}
      {filteredAllocations.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-300">No matching allocations found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAllocations.map((alloc) => (
            <div
              key={alloc.allocationid}
              className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Column: Resource & Requester Details */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 font-bold">
                    ALLOC-{alloc.allocationid}
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {alloc.resourceName ?? alloc.resourceId}
                  </span>
                  {alloc.resourceLocation && (
                    <span className="text-xs text-slate-400">
                      • {alloc.resourceLocation}
                    </span>
                  )}
                  {getAllocationStatusBadge(alloc.allocationstatus)}
                </div>

                {alloc.purpose && (
                  <p className="text-xs text-slate-300 line-clamp-2 max-w-2xl">
                    <span className="text-slate-500">Purpose: </span>
                    {alloc.purpose}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-0.5">
                  <span>
                    Booked by: <strong className="text-slate-200">{alloc.requesterName ?? alloc.requesterEmail}</strong>
                  </span>
                  {alloc.requesterRoleName && alloc.requesterScopeName && (
                    <span className="text-indigo-300 text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                      As {alloc.requesterRoleName} ({alloc.requesterScopeName})
                    </span>
                  )}
                  <span className="text-slate-500 font-mono text-[11px]">
                    (Request #{alloc.reqid})
                  </span>
                </div>
              </div>

              {/* Right Column: Time Slot & Quick Action */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800/80">
                <div className="text-xs text-right space-y-0.5">
                  <p className="text-slate-400 font-medium">
                    Start: <span className="text-slate-200 font-semibold">{formatDateTime(alloc.starttime)}</span>
                  </p>
                  <p className="text-slate-400 font-medium">
                    End: <span className="text-slate-200 font-semibold">{formatDateTime(alloc.endtime)}</span>
                  </p>
                </div>
                <Link
                  href="/admin/requests"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-1"
                >
                  <span>View Full Request Chain</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

