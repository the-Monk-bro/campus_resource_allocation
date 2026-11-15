"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cancelRequestAction } from "@/actions/requestActions";
import { RequestRecord, ApprovalStepDetail } from "./types";
import {
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Clock,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  GitCommit,
  Check,
  X,
  Plus,
  Inbox,
  Sparkles,
} from "lucide-react";

interface MyRequestsSectionProps {
  requests: RequestRecord[];
  onMakeNewRequest?: () => void;
}

type StatusFilterType = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type SortFieldType = "reqtime" | "starttime" | "endtime" | "reqstatus";
type SortOrderType = "desc" | "asc";

function ApprovalStepsDropdown({ steps }: { steps: ApprovalStepDetail[] }) {
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  if (steps.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 italic text-center py-2">
          No approval hierarchy defined for this resource.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
        Approval Review Pipeline
      </p>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isApproved = step.approvalstatus === "APPROVED";
          const isRejected = step.approvalstatus === "REJECTED";
          const isPending = step.approvalstatus === "PENDING";

          return (
            <div
              key={step.hid}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isApproved
                  ? "bg-emerald-50/60 border-emerald-200"
                  : isRejected
                  ? "bg-rose-50/60 border-rose-200"
                  : "bg-slate-50 border-slate-200/80"
              }`}
            >
              {/* Step indicator */}
              <div className="flex flex-col items-center shrink-0 mt-0.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    isApproved
                      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                      : isRejected
                      ? "bg-rose-100 border-rose-300 text-rose-700"
                      : "bg-white border-slate-300 text-slate-600"
                  }`}
                >
                  {isApproved ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isRejected ? (
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    step.hlevel
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-px flex-1 min-h-[14px] mt-1 ${
                      isApproved ? "bg-emerald-200" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>

              {/* Step details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Level {step.hlevel}
                      {step.roleName && (
                        <span className="text-indigo-600 font-semibold ml-1.5">
                          — {step.roleName}{step.scopeName ? ` (${step.scopeName})` : ""}
                        </span>
                      )}
                    </p>
                    {step.actionByName ? (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {step.approvalstatus === "APPROVED" ? "Approved by" : "Rejected by"}: <strong className="text-slate-800 font-semibold">{step.actionByName}</strong>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        Awaiting review from {step.roleName ? `${step.roleName}` : "authorized approver"}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      isApproved
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : isRejected
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}
                  >
                    {step.approvalstatus}
                  </span>
                </div>

                {step.actiontime && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Recorded on: {formatDateTime(step.actiontime)}
                  </p>
                )}

                {step.shortcomment && (
                  <p className="text-[11px] italic text-slate-700 mt-1.5 bg-white p-2 rounded-lg border border-slate-200">
                    &ldquo;{step.shortcomment}&rdquo;
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyRequestsSection({
  requests,
  onMakeNewRequest,
}: MyRequestsSectionProps) {
  const router = useRouter();

  // Filters & Ordering State
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortFieldType>("reqtime");
  const [sortOrder, setSortOrder] = useState<SortOrderType>("desc");

  // Cancellation State
  const [isCancelling, startCancelTransition] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Expanded dropdown state: stores set of reqids that are open
  const [expandedReqIds, setExpandedReqIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (reqid: number) => {
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

  // Format Datetime helper
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  // Handle Cancel Request
  const handleCancel = (reqid: number) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
    setCancelError(null);

    startCancelTransition(async () => {
      const res = await cancelRequestAction(reqid);
      if (res.success) {
        router.refresh();
      } else {
        setCancelError(res.error || "Failed to cancel request.");
      }
    });
  };

  // Filtered & Sorted Requests
  const processedRequests = useMemo(() => {
    let list = [...requests];

    // Filter by status
    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.reqstatus === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.resid.toLowerCase().includes(q) ||
          r.purpose?.toLowerCase().includes(q) ||
          r.resourceName?.toLowerCase().includes(q) ||
          r.resourceLocation?.toLowerCase().includes(q) ||
          String(r.reqid).includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === "reqtime") {
        valA = new Date(a.reqtime).getTime();
        valB = new Date(b.reqtime).getTime();
      } else if (sortField === "starttime") {
        valA = new Date(a.starttime).getTime();
        valB = new Date(b.starttime).getTime();
      } else if (sortField === "endtime") {
        valA = new Date(a.endtime).getTime();
        valB = new Date(b.endtime).getTime();
      } else {
        valA = a.reqstatus;
        valB = b.reqstatus;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [requests, statusFilter, searchQuery, sortField, sortOrder]);

  const pendingCount = requests.filter((r) => r.reqstatus === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Controls Bar: Filter & Sort */}
      <div className="saas-card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Query */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name, purpose, or #ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as StatusFilterType[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === status
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/60"
                  }`}
                >
                  {status === "ALL" ? "All Requests" : status}
                </button>
              )
            )}
          </div>

          {/* Ordering Dropdowns */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Sort:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortFieldType)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
              >
                <option value="reqtime">Request Time</option>
                <option value="starttime">Start Time</option>
                <option value="endtime">End Time</option>
                <option value="reqstatus">Status</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              title={`Sort direction: ${sortOrder === "asc" ? "Ascending (Oldest / A-Z)" : "Descending (Newest / Z-A)"}`}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {sortOrder === "desc" ? (
                <ArrowDown className="w-4 h-4 text-indigo-600" />
              ) : (
                <ArrowUp className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cancellation Error Banner */}
      {cancelError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-bold">{processedRequests.length}</strong> of{" "}
          {requests.length} total requests
        </span>
        {pendingCount > 0 && (
          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
            {pendingCount} pending review
          </span>
        )}
      </div>

      {/* Request Cards List */}
      {processedRequests.length === 0 ? (
        <div className="text-center py-16 saas-card p-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No requests match criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search query or status filter to view other records."
              : "You haven't submitted any resource allocation requests yet."}
          </p>
          {!searchQuery && statusFilter === "ALL" && onMakeNewRequest && (
            <button
              type="button"
              onClick={onMakeNewRequest}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Submit Your First Request
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {processedRequests.map((req) => {
            const isPending = req.reqstatus === "PENDING";
            const isApproved = req.reqstatus === "APPROVED";
            const isRejected = req.reqstatus === "REJECTED";
            const isExpanded = expandedReqIds.has(req.reqid);

            return (
              <div
                key={req.reqid}
                className="saas-card hover:border-slate-300 transition-all shadow-xs overflow-hidden"
              >
                {/* Main card row */}
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Facility, Purpose, and Time details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                        #{req.reqid}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {req.resourceName || req.resid}
                      </h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        ID: {req.resid}
                      </span>
                      {req.resourceLocation && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {req.resourceLocation}
                        </span>
                      )}
                    </div>

                    {/* Role & Scope Badge */}
                    {(req.requesterRoleName || req.requesterScopeName) && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md w-fit">
                        <span className="text-slate-500 text-[11px]">Requested as:</span>
                        <span className="font-semibold">{req.requesterRoleName || "Unknown Role"}</span>
                        {req.requesterScopeName && (
                          <span className="text-indigo-600 font-normal">
                            • {req.requesterScopeName}
                          </span>
                        )}
                      </div>
                    )}

                    {req.purpose ? (
                      <p className="text-xs sm:text-sm text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80">
                        &ldquo;{req.purpose}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No specific purpose mentioned.</p>
                    )}

                    {/* Timestamps */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400">From:</span>
                        <strong className="text-slate-800 font-semibold">
                          {formatDateTime(req.starttime)}
                        </strong>
                      </div>
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400">To:</span>
                        <strong className="text-slate-800 font-semibold">
                          {formatDateTime(req.endtime)}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-400 sm:col-span-2">
                        Submitted: {formatDateTime(req.reqtime)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                        isPending
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isApproved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isRejected
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {req.reqstatus}
                    </span>

                    <div className="flex items-center md:flex-col md:items-end gap-2">
                      {/* Approval Steps Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(req.reqid)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="View approval pipeline"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        Pipeline
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancel(req.reqid)}
                          disabled={isCancelling}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Approval Steps */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 bg-slate-50/40">
                    <ApprovalStepsDropdown steps={req.approvalSteps ?? []} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
