"use client";

import { useState, useMemo } from "react";
import { ApprovalStepDetail } from "@/components/requests/types";
import {
  Search,
  Filter,
  ClipboardList,
  Clock,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  GitCommit,
  Check,
  X,
  Inbox,
  Sparkles,
} from "lucide-react";

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
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
        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Requests
            </span>
            <ClipboardList className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {initialRequests.length}
          </span>
          <span className="text-[11px] text-slate-500">All submissions recorded</span>
        </div>

        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Pending Review
            </span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {initialRequests.filter((r) => r.reqstatus === "PENDING").length}
          </span>
          <span className="text-[11px] text-slate-500">Awaiting approvers</span>
        </div>

        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {initialRequests.filter((r) => r.reqstatus === "APPROVED").length}
          </span>
          <span className="text-[11px] text-slate-500">Allocated & confirmed</span>
        </div>

        <div className="saas-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Rejected / Cancelled
            </span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-black text-rose-700 mt-1 block">
            {initialRequests.filter((r) => r.reqstatus === "REJECTED" || r.reqstatus === "CANCELLED").length}
          </span>
          <span className="text-[11px] text-slate-500">Declined or aborted</span>
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
              placeholder="Search by requester name, email, facility name, or purpose..."
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
              <option value="reqtime_desc">Submitted (Newest First)</option>
              <option value="reqtime_asc">Submitted (Oldest First)</option>
              <option value="start_desc">Slot Time (Newest First)</option>
              <option value="requester">Requester Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills & Expand All */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              Status:
            </span>
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map((st) => (
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
                {st === "ALL" ? "All" : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60 transition-colors cursor-pointer"
            >
              Expand All Chains
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 border border-slate-200/60 transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Requests Feed / Cards ────────────────────────────────────── */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center saas-card space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No matching requests found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = expandedReqIds.has(req.reqid);

            return (
              <div
                key={req.reqid}
                className="p-5 sm:p-6 saas-card hover:border-slate-300 transition-all space-y-4 shadow-xs"
              >
                {/* Header Row: Facility, Location, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                      REQ #{req.reqid}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {req.resourceName ?? req.resourceId}
                    </span>
                    {req.resourceLocation && (
                      <span className="text-xs text-slate-500">
                        • {req.resourceLocation}
                      </span>
                    )}
                    {getRequestStatusBadge(req.reqstatus)}
                  </div>

                  <span className="text-xs text-slate-400">
                    Submitted: {formatDateTime(req.reqtime)}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Requester:</span>
                    <span className="text-slate-800 font-semibold text-xs sm:text-sm">
                      {req.requesterName ?? "Unknown"}
                    </span>
                    <span className="text-slate-500 block text-[11px] truncate">
                      {req.requesterEmail}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Requested As:</span>
                    {req.requesterRoleName && req.requesterScopeName ? (
                      <span className="text-indigo-700 font-medium inline-block mt-0.5 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                        {req.requesterRoleName} ({req.requesterScopeName})
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Standard Request</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Requested Time Slot:</span>
                    <span className="text-slate-800 font-semibold block">
                      {formatDateTime(req.starttime)}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      to {formatDateTime(req.endtime)}
                    </span>
                  </div>
                </div>

                {req.purpose && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <span className="text-slate-500 font-semibold mr-1">Purpose:</span>
                    {req.purpose}
                  </div>
                )}

                {/* Dropdown Toggle for Approval Hierarchy Chain */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleExpand(req.reqid)}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1 cursor-pointer"
                  >
                    <span>{isExpanded ? "Hide Review Pipeline" : "View Review Pipeline"}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                      {req.steps.length} tier{req.steps.length === 1 ? "" : "s"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </button>

                  {/* Expanded Approval Steps Dropdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
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
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                                  isApproved
                                    ? "bg-emerald-50/50 border-emerald-200"
                                    : isRejected
                                    ? "bg-rose-50/50 border-rose-200"
                                    : "bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                      L{step.hlevel}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900">
                                      {step.roleName}
                                    </span>
                                    <span className="text-slate-500 text-xs">
                                      Scope: <strong className="text-indigo-600 font-medium">{step.scopeName}</strong>
                                    </span>
                                  </div>

                                  {/* Reviewer Stamp */}
                                  <div className="text-[11px] text-slate-500 pl-7 space-y-0.5">
                                    {step.actionByName ? (
                                      <p>
                                        Reviewed by: <strong className="text-slate-800">{step.actionByName}</strong>
                                        {step.actiontime && ` on ${formatDateTime(step.actiontime)}`}
                                      </p>
                                    ) : (
                                      <p className="text-amber-700 italic">
                                        Waiting for eligible approver action
                                      </p>
                                    )}

                                    {step.shortcomment && (
                                      <p className="text-slate-600 italic bg-white p-1.5 rounded border border-slate-200 mt-1">
                                        &ldquo;{step.shortcomment}&rdquo;
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
