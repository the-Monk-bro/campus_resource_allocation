"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cancelRequestAction } from "@/actions/requestActions";
import { RequestRecord, ApprovalStepDetail } from "./types";

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
      <div className="mt-3 pt-3 border-t border-slate-800/60">
        <p className="text-xs text-slate-500 italic text-center py-2">
          No approval hierarchy defined for this resource.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/60">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Approval Pipeline
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
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : isRejected
                  ? "bg-rose-500/5 border-rose-500/20"
                  : "bg-slate-950/50 border-slate-800/60"
              }`}
            >
              {/* Step connector line */}
              <div className="flex flex-col items-center shrink-0 mt-0.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    isApproved
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : isRejected
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  {isApproved ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isRejected ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    step.hlevel
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-px flex-1 min-h-[12px] mt-1 ${
                      isApproved ? "bg-emerald-500/30" : "bg-slate-800"
                    }`}
                  />
                )}
              </div>

              {/* Step details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Level {step.hlevel}
                      {step.approverName && (
                        <span className="font-normal text-slate-400 ml-1.5">— {step.approverName}</span>
                      )}
                    </p>
                    {step.approverEmail && (
                      <p className="text-[11px] text-slate-500">{step.approverEmail}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : isRejected
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {step.approvalstatus}
                  </span>
                </div>

                {step.actiontime && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Acted on: {formatDateTime(step.actiontime)}
                  </p>
                )}

                {step.shortcomment && (
                  <p className="text-[11px] italic text-slate-400 mt-1 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/60">
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Query */}
          <div className="relative flex-1 min-w-[220px]">
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility, purpose, or ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as StatusFilterType[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800"
                  }`}
                >
                  {status === "ALL" ? "All Statuses" : status}
                </button>
              )
            )}
          </div>

          {/* Ordering Dropdowns */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Order by:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortFieldType)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
            >
              {sortOrder === "desc" ? (
                <svg
                  className="w-4 h-4 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cancellation Error Banner */}
      {cancelError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {cancelError}
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{processedRequests.length}</strong> of{" "}
          {requests.length} requests
        </span>
        {pendingCount > 0 && (
          <span className="text-amber-400 font-medium">
            {pendingCount} request{pendingCount > 1 ? "s" : ""} pending review
          </span>
        )}
      </div>

      {/* Request Cards List */}
      {processedRequests.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">No requests found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search query or status filter to view other records."
              : "You haven't submitted any resource allocation requests yet."}
          </p>
          {!searchQuery && statusFilter === "ALL" && onMakeNewRequest && (
            <button
              type="button"
              onClick={onMakeNewRequest}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition-colors"
            >
              Make Your First Request
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {processedRequests.map((req) => {
            const isPending = req.reqstatus === "PENDING";
            const isExpanded = expandedReqIds.has(req.reqid);
            const hasSteps = req.approvalSteps !== undefined;

            return (
              <div
                key={req.reqid}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-3xl transition-all shadow-md overflow-hidden"
              >
                {/* Main card row */}
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Facility, Purpose, and Time details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        #{req.reqid}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {req.resourceName || req.resid}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        ID: {req.resid}
                      </span>
                      {req.resourceLocation && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5 text-slate-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          {req.resourceLocation}
                        </span>
                      )}
                    </div>

                    {req.purpose ? (
                      <p className="text-sm text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                        &ldquo;{req.purpose}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No specific purpose mentioned.</p>
                    )}

                    {/* Timestamps */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="text-slate-400">
                        <span className="text-slate-500">From: </span>
                        <strong className="text-slate-200">
                          {formatDateTime(req.starttime)}
                        </strong>
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500">To: </span>
                        <strong className="text-slate-200">
                          {formatDateTime(req.endtime)}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-500 sm:col-span-2">
                        Requested on: {formatDateTime(req.reqtime)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        req.reqstatus === "PENDING"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : req.reqstatus === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : req.reqstatus === "REJECTED"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-slate-700/20 text-slate-400 border-slate-700/40"
                      }`}
                    >
                      {req.reqstatus}
                    </span>

                    <div className="flex flex-col items-end gap-2">
                      {/* Approval Steps Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(req.reqid)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-colors"
                        title="View approval pipeline"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        Approvals
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancel(req.reqid)}
                          disabled={isCancelling}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors disabled:opacity-50"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Approval Steps */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
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
