"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actOnApprovalAction, PendingApprovalItem } from "@/actions/approvalActions";

interface ApprovalsViewProps {
  items: PendingApprovalItem[];
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ApprovalCard({ item }: { item: PendingApprovalItem }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [isActing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAction = (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !comment.trim()) {
      setError("Please provide a comment when rejecting a request.");
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await actOnApprovalAction({
        hid: item.hid,
        reqid: item.reqid,
        action,
        comment: comment.trim() || undefined,
      });

      if (res.success) {
        setSuccess(res.message);
        router.refresh();
      } else {
        setError(res.error || "Action failed.");
      }
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-3xl shadow-md overflow-hidden transition-all">
      {/* Header */}
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          {/* Resource + Level badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              Req #{item.reqid}
            </span>
            <h3 className="text-base font-bold text-white">
              {item.resourceName || item.resid}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Level {item.hlevel} Approval ({item.roleName} &bull; {item.scopeName})
            </span>
            {item.resourceLocation && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {item.resourceLocation}
              </span>
            )}
          </div>

          {/* Requester info & Requested As tag */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>
                Requested by <strong className="text-slate-200">{item.requesterName || "Unknown"}</strong>
                {item.requesterEmail && (
                  <span className="text-slate-500 ml-1">({item.requesterEmail})</span>
                )}
              </span>
            </div>

            {(item.requesterRoleName || item.requesterScopeName) && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-xl">
                <span className="text-slate-400 text-[11px]">Requested as:</span>
                <span className="font-semibold text-indigo-200">{item.requesterRoleName || "Unknown Role"}</span>
                {item.requesterScopeName && (
                  <span className="text-indigo-400 font-normal">
                    &bull; {item.requesterScopeName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Purpose */}
          {item.purpose ? (
            <p className="text-sm text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
              &ldquo;{item.purpose}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-slate-500 italic">No purpose mentioned.</p>
          )}

          {/* Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            <div className="text-slate-400">
              <span className="text-slate-500">From: </span>
              <strong className="text-slate-200">{formatDateTime(item.starttime)}</strong>
            </div>
            <div className="text-slate-400">
              <span className="text-slate-500">To: </span>
              <strong className="text-slate-200">{formatDateTime(item.endtime)}</strong>
            </div>
            <div className="text-[11px] text-slate-500 sm:col-span-2">
              Requested on: {formatDateTime(item.reqtime)} &bull; Assigned to you: {formatDateTime(item.issuetime)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-slate-800/60 pt-4 space-y-3">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Comment <span className="text-rose-400 font-normal normal-case">(required for rejection)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment about your decision..."
          maxLength={100}
          rows={2}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">{comment.length}/100 characters</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAction("REJECT")}
              disabled={isActing || !!success}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleAction("APPROVE")}
              disabled={isActing || !!success}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApprovalsView({ items }: ApprovalsViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Approvals</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review and act on pending resource allocation requests assigned to you.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
          <span className="font-bold text-white">{items.length}</span> pending
          {items.length !== 1 ? " approvals" : " approval"}
        </div>
      </div>

      {/* Cards */}
      {items.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">All clear!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You have no pending approval requests at this time. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => (
            <ApprovalCard key={`${item.hid}-${item.reqid}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
