"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  PlayCircle,
  CalendarRange,
  XCircle,
  Inbox,
  User,
  Building2,
  Tag,
} from "lucide-react";
import CancelAllocationButton from "@/components/allocations/CancelAllocationButton";

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Scheduled
        </span>
      );
    case "ONGOING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Ongoing Now
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Completed
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
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
        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Allocations
            </span>
            <CalendarRange className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {initialAllocations.length}
          </span>
          <span className="text-[11px] text-slate-500">Across all resources</span>
        </div>

        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Scheduled
            </span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {initialAllocations.filter((a) => a.allocationstatus === "SCHEDULED").length}
          </span>
          <span className="text-[11px] text-slate-500">Upcoming confirmed slots</span>
        </div>

        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Ongoing Active
            </span>
            <PlayCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">
            {initialAllocations.filter((a) => a.allocationstatus === "ONGOING").length}
          </span>
          <span className="text-[11px] text-slate-500">Currently in progress</span>
        </div>

        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-700 mt-1 block">
            {initialAllocations.filter((a) => a.allocationstatus === "COMPLETED").length}
          </span>
          <span className="text-[11px] text-slate-500">Archived past slots</span>
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
              placeholder="Search by facility, location, requester name, or purpose..."
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
              <option value="time_desc">Booking Start (Newest First)</option>
              <option value="time_asc">Booking Start (Oldest First)</option>
              <option value="resource">Resource Name (A-Z)</option>
              <option value="requester">Requester Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              Status:
            </span>
            {(["ALL", "SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
                }`}
              >
                {st === "ALL" ? "All Statuses" : st}
              </button>
            ))}
          </div>

          {/* Type Filters */}
          {resourceTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                Type:
              </span>
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === "ALL"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
                }`}
              >
                All
              </button>
              {resourceTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    typeFilter === t
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
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
        <div className="p-12 text-center saas-card space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No matching allocations found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAllocations.map((alloc) => (
            <div
              key={alloc.allocationid}
              className="p-5 saas-card hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs"
            >
              {/* Left Column: Resource & Requester Details */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                    ALLOC-{alloc.allocationid}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {alloc.resourceName ?? alloc.resourceId}
                  </span>
                  {alloc.resourceLocation && (
                    <span className="text-xs text-slate-500">
                      • {alloc.resourceLocation}
                    </span>
                  )}
                  {getAllocationStatusBadge(alloc.allocationstatus)}
                </div>

                {alloc.purpose && (
                  <p className="text-xs text-slate-700 line-clamp-2 max-w-2xl bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-medium">Purpose: </span>
                    {alloc.purpose}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Booked by: <strong className="text-slate-800">{alloc.requesterName ?? alloc.requesterEmail}</strong>
                  </span>
                  {alloc.requesterRoleName && alloc.requesterScopeName && (
                    <span className="text-indigo-700 text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 font-medium">
                      {alloc.requesterRoleName} ({alloc.requesterScopeName})
                    </span>
                  )}
                  <span className="text-slate-400 font-mono text-[11px]">
                    (Request #{alloc.reqid})
                  </span>
                </div>
              </div>

              {/* Right Column: Time Slot & Quick Action */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                <div className="text-xs text-left lg:text-right space-y-0.5">
                  <p className="text-slate-500 font-medium flex items-center lg:justify-end gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Start:</span>
                    <strong className="text-slate-800 font-semibold">{formatDateTime(alloc.starttime)}</strong>
                  </p>
                  <p className="text-slate-500 font-medium flex items-center lg:justify-end gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>End:</span>
                    <strong className="text-slate-800 font-semibold">{formatDateTime(alloc.endtime)}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Link
                    href="/admin/requests"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                  >
                    <span>Audit Chain</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {alloc.allocationstatus === "SCHEDULED" && (
                    <CancelAllocationButton
                      allocationId={alloc.allocationid}
                      resourceName={alloc.resourceName ?? alloc.resourceId}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
