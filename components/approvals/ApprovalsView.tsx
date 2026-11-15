"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actOnApprovalAction, PendingApprovalItem } from "@/actions/approvalActions";
import {
  Check,
  X,
  MapPin,
  Clock,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Calendar,
} from "lucide-react";

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
    <div className="saas-card overflow-hidden">
      {/* Header Info */}
      <div className="p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Req #{item.reqid}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {item.resourceName || item.resid}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Level {item.hlevel} Approval ({item.roleName} &middot; {item.scopeName})
            </span>
          </div>

          {item.resourceLocation && (
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.resourceLocation}</span>
            </span>
          )}
        </div>

        {/* Requester Profile Strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Requested by{" "}
              <strong className="text-slate-900 font-semibold">
                {item.requesterName || "Unknown"}
              </strong>
              {item.requesterEmail && (
                <span className="text-slate-400 ml-1">({item.requesterEmail})</span>
              )}
            </span>
          </div>

          {(item.requesterRoleName || item.requesterScopeName) && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
              <Shield className="w-3 h-3 text-indigo-500" />
              <span className="text-slate-500">As:</span>
              <span className="font-medium text-slate-800">
                {item.requesterRoleName || "Member"}
              </span>
              {item.requesterScopeName && (
                <span className="text-slate-500">&middot; {item.requesterScopeName}</span>
              )}
            </div>
          )}
        </div>

        {/* Purpose */}
        {item.purpose ? (
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg text-xs sm:text-sm text-slate-700 italic">
            &ldquo;{item.purpose}&rdquo;
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No purpose specified.</p>
        )}

        {/* Timings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              From:{" "}
              <strong className="text-slate-800">
                {formatDateTime(item.starttime)}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              To:{" "}
              <strong className="text-slate-800">
                {formatDateTime(item.endtime)}
              </strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 sm:col-span-2">
            Requested: {formatDateTime(item.reqtime)} &middot; Assigned: {formatDateTime(item.issuetime)}
          </div>
        </div>
      </div>

      {/* Decision Panel */}
      <div className="px-5 sm:px-6 pb-5 border-t border-slate-100 pt-4 space-y-3 bg-slate-50/60">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Approval Comment{" "}
            <span className="text-rose-600 font-normal">
              (mandatory for rejection)
            </span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add reasoning, requirements, or approval conditions..."
            maxLength={100}
            rows={2}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            {comment.length}/100 characters
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAction("REJECT")}
              disabled={isActing || !!success}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject Request</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("APPROVE")}
              disabled={isActing || !!success}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Request</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApprovalsView({ items }: ApprovalsViewProps) {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Approvals Worklist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review and sign off on facility reservation requests requiring your tier authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-md text-xs font-semibold text-amber-800">
            {items.length} Pending {items.length === 1 ? "Review" : "Reviews"}
          </span>
        </div>
      </div>

      {/* Cards */}
      {items.length === 0 ? (
        <div className="saas-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">All Queues Cleared!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no pending approval steps requiring your action. New requests will appear here automatically.
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
