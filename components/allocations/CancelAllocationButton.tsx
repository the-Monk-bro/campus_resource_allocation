"use client";

import { useState, useTransition } from "react";
import { cancelAllocationAction } from "@/actions/allocationAction";
import { XCircle, Loader2 } from "lucide-react";

interface CancelAllocationButtonProps {
  allocationId: number;
  resourceName?: string;
}

export default function CancelAllocationButton({
  allocationId,
  resourceName,
}: CancelAllocationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    const confirmMsg = resourceName
      ? `Are you sure you want to cancel your scheduled allocation for "${resourceName}"? The time slot will be immediately released.`
      : `Are you sure you want to cancel scheduled allocation #${allocationId}? The time slot will be immediately released.`;

    if (!window.confirm(confirmMsg)) return;

    setError(null);
    startTransition(async () => {
      const res = await cancelAllocationAction(allocationId);
      if (!res.success) {
        setError(res.error || "Failed to cancel allocation.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        title="Cancel this scheduled booking"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Cancelling...</span>
          </>
        ) : (
          <>
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel Allocation</span>
          </>
        )}
      </button>

      {error && (
        <span className="text-[11px] text-rose-600 font-medium max-w-xs text-right">
          {error}
        </span>
      )}
    </div>
  );
}

