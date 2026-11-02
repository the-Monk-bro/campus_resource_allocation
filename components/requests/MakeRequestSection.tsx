"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createRequestAction, getApprovalHierarchyAction, ApproverInfo } from "@/actions/requestActions";
import { ResourceItem } from "./types";

interface MakeRequestSectionProps {
  resources: ResourceItem[];
  onSwitchToMyRequests?: () => void;
}

export default function MakeRequestSection({
  resources,
  onSwitchToMyRequests,
}: MakeRequestSectionProps) {
  const router = useRouter();

  // Form State
  const [selectedResId, setSelectedResId] = useState<string>(resources[0]?.id || "");
  const [customResId, setCustomResId] = useState<string>("");
  const [isCustomResource, setIsCustomResource] = useState<boolean>(false);
  const [purpose, setPurpose] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Approval Hierarchy State
  const [approvers, setApprovers] = useState<ApproverInfo[]>([]);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);

  // Feedback State
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Validation
  const effectiveResId = isCustomResource ? customResId.trim() : selectedResId;
  const isTimeOrderValid =
    !startTime || !endTime || new Date(endTime).getTime() > new Date(startTime).getTime();
  const isFormValid =
    Boolean(effectiveResId) &&
    Boolean(startTime) &&
    Boolean(endTime) &&
    isTimeOrderValid;

  // Selected Resource details
  const selectedResourceDetails = useMemo(() => {
    return resources.find((r) => r.id === selectedResId);
  }, [resources, selectedResId]);

  // Fetch approval hierarchy whenever selected resource changes
  useEffect(() => {
    const resid = isCustomResource ? customResId.trim() : selectedResId;
    if (!resid) {
      setApprovers([]);
      return;
    }
    setIsLoadingHierarchy(true);
    getApprovalHierarchyAction(resid).then((result) => {
      if (result.success) {
        setApprovers(result.approvers);
      } else {
        setApprovers([]);
      }
      setIsLoadingHierarchy(false);
    });
  }, [selectedResId, customResId, isCustomResource]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!effectiveResId) {
      setFormError("Please select or specify a resource.");
      return;
    }

    if (!startTime || !endTime) {
      setFormError("Both start time and end time are required.");
      return;
    }

    if (!isTimeOrderValid) {
      setFormError("End date & time must be strictly after start date & time.");
      return;
    }

    startSubmitTransition(async () => {
      const res = await createRequestAction({
        resid: effectiveResId,
        purpose: purpose.trim() || undefined,
        starttime: startTime,
        endtime: endTime,
      });

      if (res.success) {
        setFormSuccess(res.message || "Request submitted successfully!");
        setPurpose("");
        setStartTime("");
        setEndTime("");
        router.refresh();
      } else {
        setFormError(res.error || "Failed to submit request.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Card (2 Columns on large screens) */}
      <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            Submit New Request
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Fill in the required information to request campus resource allocation.
          </p>
        </div>

        {/* Success Banner */}
        {formSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <svg
                className="w-5 h-5 text-emerald-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-semibold text-sm">{formSuccess}</p>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Your request has been recorded and is currently in PENDING status.
                </p>
              </div>
            </div>
            {onSwitchToMyRequests && (
              <button
                type="button"
                onClick={onSwitchToMyRequests}
                className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-200 transition-colors shrink-0"
              >
                View in My Requests &rarr;
              </button>
            )}
          </div>
        )}

        {/* Error Banner */}
        {formError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5">
            <svg
              className="w-5 h-5 text-rose-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium text-sm">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resource Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200">
                Select Facility <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomResource(!isCustomResource)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isCustomResource ? "← Choose from campus list" : "Enter custom Resource ID"}
              </button>
            </div>

            {!isCustomResource ? (
              resources.length > 0 ? (
                <select
                  value={selectedResId}
                  onChange={(e) => setSelectedResId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  {resources.map((res) => (
                    <option key={res.id} value={res.id} className="bg-slate-900 text-slate-100">
                      {res.name} ({res.id}) — {res.location || "Main Campus"} | Cap: {res.capacity ?? "N/A"}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                  No resources found in database. Enter a custom Resource ID below.
                </div>
              )
            ) : (
              <input
                type="text"
                value={customResId}
                onChange={(e) => setCustomResId(e.target.value)}
                placeholder="e.g. LH-101 or LAB-CS-1"
                maxLength={100}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            )}
          </div>

          {/* Purpose */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200">
                Purpose / Event Description
              </label>
              <span
                className={`text-xs ${
                  purpose.length > 90 ? "text-amber-400 font-bold" : "text-slate-500"
                }`}
              >
                {purpose.length}/100
              </span>
            </div>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. AI/ML Guest Lecture & Workshop"
              maxLength={100}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Start and End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Start Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                End Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Time Validation Warning */}
          {!isTimeOrderValid && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>End date & time must be strictly after start date & time.</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xl transition-all ${
                isFormValid && !isSubmitting
                  ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/30 cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth={4}
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Submit Resource Request</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Once submitted, admin approval is required before the resource is allocated.
            </p>
          </div>
        </form>
      </div>

      {/* Facility Specs Sidebar (1 Column) */}
      <div className="space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-4">
            Selected Facility
          </h3>
          {selectedResourceDetails ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-white">
                  {selectedResourceDetails.name}
                </h4>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  ID: {selectedResourceDetails.id}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Type:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedResourceDetails.type || "General Facility"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Capacity:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedResourceDetails.capacity
                      ? `${selectedResourceDetails.capacity} persons`
                      : "Unspecified"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Location:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedResourceDetails.location || "Main Campus"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                    {selectedResourceDetails.status}
                  </span>
                </div>
              </div>

              {/* Approval Chain */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                  Approval Chain
                </p>
                {isLoadingHierarchy ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="animate-spin w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading approvers...</span>
                  </div>
                ) : approvers.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No approval hierarchy configured for this resource.</p>
                ) : (
                  <ol className="space-y-2">
                    {approvers.map((approver, idx) => (
                      <li key={approver.hid} className="flex items-start gap-2.5">
                        {/* Level Badge */}
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {approver.hlevel}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {approver.approverName || "Unknown"}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {[approver.approverRole, approver.approverDepartment].filter(Boolean).join(" · ") || approver.approverEmail || "—"}
                          </p>
                        </div>
                        {/* Connector arrow (not on last item) */}
                        {idx < approvers.length - 1 && (
                          <svg className="w-3 h-3 text-slate-700 ml-auto mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Select a facility from the dropdown to see its specifications.
            </p>
          )}
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 text-xs text-slate-400 space-y-3">
          <h4 className="font-bold text-slate-200 text-sm">Booking Guidelines</h4>
          <ul className="space-y-2 list-disc list-inside text-slate-400">
            <li>Both start and end dates and times are required.</li>
            <li>Provide a short purpose to expedite reviewer approval.</li>
            <li>You can view and track your requests anytime in &ldquo;My Requests&rdquo;.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
