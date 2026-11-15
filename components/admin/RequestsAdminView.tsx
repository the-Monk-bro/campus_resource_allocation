"use client";

import { useState, useMemo } from "react";
import { ApprovalStepDetail } from "@/components/requests/types";

export interface AdminRequestItem {
  reqid: number;
  purpose: string | null;
  reqtime: string;
  starttime: string;
  endtime: string;
  reqstatus: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  resourceId: string;
  resourceName: string | null;
  resourceType: string | null;
  resourceLocation: string | null;
  requesterRoleName: string | null;
  requesterScopeName: string | null;
  steps: ApprovalStepDetail[];
}

interface RequestsAdminViewProps {
  initialRequests: AdminRequestItem[];
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getRequestStatusBadge(status: string) {
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

export default function RequestsAdminView({ initialRequests }: RequestsAdminViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"reqtime_desc" | "reqtime_asc" | "start_desc" | "requester">("reqtime_desc");
  const [expandedReqIds, setExpandedReqIds] = useState<Set<number>>(new Set());

  // Distinct resource types
  const resourceTypes = useMemo(() => {
    const set = new Set<string>();
    initialRequests.forEach((r) => {
      if (r.resourceType) set.add(r.resourceType);
    });
    return Array.from(set).sort();
  }, [initialRequests]);

  const toggleExpand = (reqid: number) => {
    setExpandedReqIds((prev) => {
      const next = new Set(prev);
      if (next.has(reqid)) {
        next.delete(reqid);
      } else {
        next.add(reqid);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedReqIds(new Set(initialRequests.map((r) => r.reqid)));
  };

  const collapseAll = () => {
    setExpandedReqIds(new Set());
  };

  // Filter & Sort
  const filteredRequests = useMemo(() => {
    return initialRequests
      .filter((req) => {
        // Status filter
        if (statusFilter !== "ALL" && req.reqstatus !== statusFilter) {
          return false;
        }
        // Type filter
        if (typeFilter !== "ALL" && req.resourceType !== typeFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesResource =
            (req.resourceName && req.resourceName.toLowerCase().includes(q)) ||
            req.resourceId.toLowerCase().includes(q) ||
            (req.resourceLocation && req.resourceLocation.toLowerCase().includes(q));
          const matchesUser =
            (req.requesterName && req.requesterName.toLowerCase().includes(q)) ||
            (req.requesterEmail && req.requesterEmail.toLowerCase().includes(q));
          const matchesPurpose = req.purpose ? req.purpose.toLowerCase().includes(q) : false;
          return matchesResource || matchesUser || matchesPurpose;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "reqtime_desc") {
          return new Date(b.reqtime).getTime() - new Date(a.reqtime).getTime();
        }
        if (sortBy === "reqtime_asc") {
          return new Date(a.reqtime).getTime() - new Date(b.reqtime).getTime();
        }
        if (sortBy === "start_desc") {
          return new Date(b.starttime).getTime() - new Date(a.starttime).getTime();
        }
        if (sortBy === "requester") {
          return (a.requesterName || "").localeCompare(b.requesterName || "");
        }
        return 0;
      });
  }, [initialRequests, statusFilter, typeFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* ── Summary Counters ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Total Requests
          </span>
          <span className="text-2xl font-black text-white mt-1 block">
            {initialRequests.length}
          </span>
          <span className="text-[11px] text-slate-500">All submissions recorded</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-amber-400 font-medium uppercase tracking-wider block">
            Pending Review
          </span>
          <span className="text-2xl font-black text-amber-300 mt-1 block">
            {initialRequests.filter((r) => r.reqstatus === "PENDING").length}
          </span>
          <span className="text-[11px] text-slate-500">In approval pipeline</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider block">
            Approved
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {initialRequests.filter((r) => r.reqstatus === "APPROVED").length}
          </span>
          <span className="text-[11px] text-slate-500">Allocated & confirmed</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <span className="text-xs text-rose-400 font-medium uppercase tracking-wider block">
            Rejected / Cancelled
          </span>
          <span className="text-2xl font-black text-rose-300 mt-1 block">
            {initialRequests.filter((r) => r.reqstatus === "REJECTED" || r.reqstatus === "CANCELLED").length}
          </span>
          <span className="text-[11px] text-slate-500">Declined or aborted</span>
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
              placeholder="Search by requester name, email, facility name, or purpose..."
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
              <option value="reqtime_desc">Submitted (Newest First)</option>
              <option value="reqtime_asc">Submitted (Oldest First)</option>
              <option value="start_desc">Slot Time (Newest First)</option>
              <option value="requester">Requester Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills & Expand All */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map((st) => (
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Expand All Chains
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Requests Feed / Cards ────────────────────────────────────── */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-300">No matching requests found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = expandedReqIds.has(req.reqid);

            return (
              <div
                key={req.reqid}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/85 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-xl"
              >
                {/* Header Row: Facility, Location, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 font-bold">
                      REQ #{req.reqid}
                    </span>
                    <span className="text-base font-extrabold text-white">
                      {req.resourceName ?? req.resourceId}
                    </span>
                    {req.resourceLocation && (
                      <span className="text-xs text-slate-400">
                        • {req.resourceLocation}
                      </span>
                    )}
                    {getRequestStatusBadge(req.reqstatus)}
                  </div>

                  <span className="text-xs text-slate-500">
                    Submitted: {formatDateTime(req.reqtime)}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Requester:</span>
                    <span className="text-slate-200 font-semibold text-sm">
                      {req.requesterName ?? "Unknown"}
                    </span>
                    <span className="text-slate-400 block text-[11px] truncate">
                      {req.requesterEmail}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Requested As:</span>
                    {req.requesterRoleName && req.requesterScopeName ? (
                      <span className="text-indigo-300 font-medium inline-block mt-0.5 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                        {req.requesterRoleName} ({req.requesterScopeName})
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Standard Request</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block">Requested Time Slot:</span>
                    <span className="text-slate-300 font-medium block">
                      {formatDateTime(req.starttime)}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      to {formatDateTime(req.endtime)}
                    </span>
                  </div>
                </div>

                {req.purpose && (
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300">
                    <span className="text-slate-500 font-semibold mr-1">Purpose:</span>
                    {req.purpose}
                  </div>
                )}

                {/* Dropdown Toggle for Approval Hierarchy Chain */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(req.reqid)}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-1 cursor-pointer"
                  >
                    <span>{isExpanded ? "Hide Approval Chain" : "View Approval Chain"}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold">
                      {req.steps.length} tier{req.steps.length === 1 ? "" : "s"}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded Approval Steps Dropdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Sequential Approval Pipeline
                      </p>

                      {req.steps.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No approval hierarchy configured for this resource.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {req.steps.map((step) => {
                            const isApproved = step.approvalstatus === "APPROVED";
                            const isRejected = step.approvalstatus === "REJECTED";
                            const isPending = step.approvalstatus === "PENDING";

                            return (
                              <div
                                key={step.hid}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                                  isApproved
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : isRejected
                                    ? "bg-rose-500/5 border-rose-500/20"
                                    : "bg-slate-950/60 border-slate-800/70"
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center">
                                      {step.hlevel}
                                    </span>
                                    <span className="text-xs font-bold text-white">
                                      {step.roleName}
                                    </span>
                                    <span className="text-slate-400 text-xs">
                                      Scope: <strong className="text-indigo-300 font-medium">{step.scopeName}</strong>
                                    </span>
                                  </div>

                                  {/* Reviewer Stamp */}
                                  <div className="text-[11px] text-slate-400 pl-7 space-y-0.5">
                                    {step.actionByName ? (
                                      <p>
                                        Reviewed by: <strong className="text-slate-300">{step.actionByName}</strong>
                                        {step.actiontime && ` on ${formatDateTime(step.actiontime)}`}
                                      </p>
                                    ) : (
                                      <p className="text-amber-400/80 italic">
                                        Waiting for eligible co-approver action
                                      </p>
                                    )}

                                    {step.shortcomment && (
                                      <p className="text-slate-400 italic">
                                        Note: &ldquo;{step.shortcomment}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="self-start sm:self-center pl-7 sm:pl-0">
                                  {getRequestStatusBadge(step.approvalstatus)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

