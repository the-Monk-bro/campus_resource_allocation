"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createRequestAction, getApprovalHierarchyAction } from "@/actions/requestActions";
import { ResourceItem, UserActiveRoleAssignment, ApproverInfo } from "./types";

interface MakeRequestSectionProps {
  resources: ResourceItem[];
  activeAssignments?: UserActiveRoleAssignment[];
  onSwitchToMyRequests?: () => void;
  defaultResourceId?: string;
}

// 24x7 schedule: All 48 half-hour slots across the full 24-hour day (00:00 to 23:30)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function formatTimeLabel(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0 && m === "00") return "12:00 AM (Midnight)";
  if (h === 12 && m === "00") return "12:00 PM (Noon)";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function formatDateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0 mins";
  const totalMins = Math.round(ms / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
  if (mins > 0) parts.push(`${mins} min${mins > 1 ? "s" : ""}`);
  return parts.join(" ") || "0 mins";
}

function formatSchedulePreview(startStr: string, endStr: string): string {
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const isSameDay =
      s.getFullYear() === e.getFullYear() &&
      s.getMonth() === e.getMonth() &&
      s.getDate() === e.getDate();

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    if (isSameDay) {
      return `${s.toLocaleDateString("en-US", dateOptions)} • ${s.toLocaleTimeString(
        "en-US",
        timeOptions
      )} – ${e.toLocaleTimeString("en-US", timeOptions)}`;
    } else {
      return `${s.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}, ${s.toLocaleTimeString("en-US", timeOptions)} → ${e.toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" }
      )}, ${e.toLocaleTimeString("en-US", timeOptions)}`;
    }
  } catch {
    return `${startStr} to ${endStr}`;
  }
}

export default function MakeRequestSection({
  resources,
  activeAssignments = [],
  onSwitchToMyRequests,
  defaultResourceId,
}: MakeRequestSectionProps) {
  const router = useRouter();

  // Form State
  const initialResId =
    defaultResourceId && resources.some((r) => r.id === defaultResourceId)
      ? defaultResourceId
      : resources[0]?.id || "";
  const [selectedResId, setSelectedResId] = useState<string>(initialResId);
  const [customResId, setCustomResId] = useState<string>("");
  const [isCustomResource, setIsCustomResource] = useState<boolean>(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | "">(
    activeAssignments[0]?.assignmentId ?? ""
  );
  const [purpose, setPurpose] = useState<string>("");

  // Modern Date & Time states
  const todayStr = useMemo(() => formatDateToIso(new Date()), []);
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("10:00");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("12:00");
  const [useCustomStartTime, setUseCustomStartTime] = useState(false);
  const [useCustomEndTime, setUseCustomEndTime] = useState(false);

  // Approval Hierarchy State
  const [approvers, setApprovers] = useState<ApproverInfo[]>([]);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);

  // Feedback State
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Preset Date shortcuts
  const presetDates = useMemo(() => {
    const now = new Date();
    const today = formatDateToIso(now);

    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    const tomorrow = formatDateToIso(tom);

    // This coming Friday
    const fri = new Date(now);
    const day = fri.getDay();
    const diffFri = (5 - day + 7) % 7 || 7;
    fri.setDate(fri.getDate() + diffFri);
    const friday = formatDateToIso(fri);

    // Next Monday
    const mon = new Date(now);
    const diffMon = (1 - day + 7) % 7 || 7;
    mon.setDate(mon.getDate() + diffMon);
    const monday = formatDateToIso(mon);

    return { today, tomorrow, friday, monday };
  }, []);

  // Sync selectedAssignmentId when activeAssignments changes
  useEffect(() => {
    if (activeAssignments.length > 0) {
      if (
        selectedAssignmentId === "" ||
        !activeAssignments.some((a) => a.assignmentId === selectedAssignmentId)
      ) {
        setSelectedAssignmentId(activeAssignments[0].assignmentId);
      }
    }
  }, [activeAssignments, selectedAssignmentId]);

  // Sync selected resource if defaultResourceId is provided via URL
  useEffect(() => {
    if (defaultResourceId && resources.some((r) => r.id === defaultResourceId)) {
      setSelectedResId(defaultResourceId);
      setIsCustomResource(false);
    }
  }, [defaultResourceId, resources]);

  // Handle Start Date change: automatically makes End Date the same (but changable)
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    // Automatic sync: make end date the same
    setEndDate(newStartDate);
  };

  // Handle End Date change: allows user to freely adjust End Date
  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate);
  };

  // Handle Quick Date Presets
  const applyPresetDate = (dateVal: string) => {
    setStartDate(dateVal);
    setEndDate(dateVal);
  };

  // Handle Quick Duration Buttons (+1 hr, +2 hrs, +3 hrs, +4 hrs)
  const applyDurationHours = (hoursToAdd: number) => {
    const baseDate = startDate || todayStr;
    if (!startDate) {
      setStartDate(baseDate);
      setEndDate(baseDate);
    }

    const baseStart = startTime || "09:00";
    const [h, m] = baseStart.split(":").map(Number);
    const totalStartMinutes = h * 60 + m;
    const totalEndMinutes = totalStartMinutes + hoursToAdd * 60;

    const endH = Math.floor(totalEndMinutes / 60) % 24;
    const endM = totalEndMinutes % 60;
    const newEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    setEndTime(newEndTime);
    setUseCustomEndTime(false);

    if (totalEndMinutes >= 1440) {
      const daysExtra = Math.floor(totalEndMinutes / 1440);
      const targetDate = new Date(baseDate);
      targetDate.setDate(targetDate.getDate() + daysExtra);
      setEndDate(formatDateToIso(targetDate));
    } else {
      setEndDate(baseDate);
    }
  };

  // Handle Full Day (9 AM - 6 PM)
  const applyFullDay = () => {
    const baseDate = startDate || todayStr;
    setStartDate(baseDate);
    setEndDate(baseDate);
    setStartTime("09:00");
    setEndTime("18:00");
    setUseCustomStartTime(false);
    setUseCustomEndTime(false);
  };

  // Handle Overnight (10 PM - 6 AM next day)
  const applyOvernight = () => {
    const baseDate = startDate || todayStr;
    setStartDate(baseDate);
    setStartTime("22:00");
    setEndTime("06:00");
    const nextDay = new Date(baseDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setEndDate(formatDateToIso(nextDay));
    setUseCustomStartTime(false);
    setUseCustomEndTime(false);
  };

  // Handle 24 Hours continuous allocation
  const apply24Hours = () => {
    const baseDate = startDate || todayStr;
    setStartDate(baseDate);
    const curStart = startTime || "10:00";
    setStartTime(curStart);
    setEndTime(curStart);
    const nextDay = new Date(baseDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setEndDate(formatDateToIso(nextDay));
  };

  // Validation
  const effectiveResId = isCustomResource ? customResId.trim() : selectedResId;
  const effectiveStart = startDate && startTime ? `${startDate}T${startTime}` : "";
  const effectiveEnd = endDate && endTime ? `${endDate}T${endTime}` : "";

  const startTimestamp = effectiveStart ? new Date(effectiveStart).getTime() : 0;
  const endTimestamp = effectiveEnd ? new Date(effectiveEnd).getTime() : 0;
  const isTimeOrderValid =
    !effectiveStart || !effectiveEnd || endTimestamp > startTimestamp;
  const durationMs =
    isTimeOrderValid && endTimestamp > startTimestamp ? endTimestamp - startTimestamp : 0;

  const hasActiveAssignments =
    activeAssignments.length > 0 && selectedAssignmentId !== "";
  const isFormValid =
    Boolean(effectiveResId) &&
    Boolean(startDate) &&
    Boolean(startTime) &&
    Boolean(endDate) &&
    Boolean(endTime) &&
    isTimeOrderValid &&
    hasActiveAssignments;

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

    if (!selectedAssignmentId) {
      setFormError(
        "Please select a role to request as. An active role assignment is required."
      );
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      setFormError("Both start and end dates and times are required.");
      return;
    }

    if (!isTimeOrderValid) {
      setFormError("End date & time must be strictly after start date & time.");
      return;
    }

    startSubmitTransition(async () => {
      const res = await createRequestAction({
        resid: effectiveResId,
        assignmentId: Number(selectedAssignmentId),
        purpose: purpose.trim() || undefined,
        starttime: effectiveStart,
        endtime: effectiveEnd,
      });

      if (res.success) {
        setFormSuccess(res.message || "Request submitted successfully!");
        setPurpose("");
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
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-emerald-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold">{formSuccess}</p>
            </div>
            {onSwitchToMyRequests && (
              <button
                type="button"
                onClick={onSwitchToMyRequests}
                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0"
              >
                View in My Requests →
              </button>
            )}
          </div>
        )}

        {/* Error Banner */}
        {formError && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resource Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200">
                Resource / Facility <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomResource(!isCustomResource)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
              >
                {isCustomResource ? "← Select from list" : "Enter custom Resource ID"}
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

          {/* Requesting As (Role Assignment) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200">
                Requesting As <span className="text-rose-400">*</span>
              </label>
              {activeAssignments.length > 0 && (
                <span className="text-xs text-indigo-400">
                  {activeAssignments.length} active {activeAssignments.length === 1 ? "role" : "roles"}
                </span>
              )}
            </div>

            {activeAssignments.length > 0 ? (
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                {activeAssignments.map((a) => (
                  <option key={a.assignmentId} value={a.assignmentId} className="bg-slate-900 text-slate-100">
                    {a.roleName} — {a.scopeName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>No active role assignments found. You need an active role assignment to submit requests.</span>
              </div>
            )}
          </div>

          {/* Purpose */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200">
                Purpose / Event Description
              </label>
              <span className={`text-xs ${purpose.length > 90 ? "text-amber-400 font-bold" : "text-slate-500"}`}>
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

          {/* ── Modern Date & Time Schedule Section ────────────────────── */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white block">Schedule & Allocation Window</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    24x7 Available
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Round-the-clock booking. Start date auto-syncs end date; both dates & times are fully editable.
                </span>
              </div>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500">Quick Date:</span>
                <button
                  type="button"
                  onClick={() => applyPresetDate(presetDates.today)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    startDate === presetDates.today
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDate(presetDates.tomorrow)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    startDate === presetDates.tomorrow
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDate(presetDates.friday)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    startDate === presetDates.friday
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  This Friday
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDate(presetDates.monday)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    startDate === presetDates.monday
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  Next Mon
                </button>
              </div>
            </div>

            {/* Side-by-side Start & End Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Booking Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Start Schedule</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCustomStartTime(!useCustomStartTime)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    {useCustomStartTime ? "Presets list" : "Custom time"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Start Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Start Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      min={todayStr}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Start Time <span className="text-rose-400">*</span>
                    </label>
                    {!useCustomStartTime ? (
                      <select
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTimeLabel(t)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* End Booking Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-xs font-bold text-slate-200">End Schedule</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCustomEndTime(!useCustomEndTime)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    {useCustomEndTime ? "Presets list" : "Custom time"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* End Date (Auto-synced with startDate, but fully editable) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      End Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      min={startDate || todayStr}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      End Time <span className="text-rose-400">*</span>
                    </label>
                    {!useCustomEndTime ? (
                      <select
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTimeLabel(t)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Duration Shortcuts */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 overflow-x-auto pb-1">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Duration:</span>
              <button
                type="button"
                onClick={() => applyDurationHours(1)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
              >
                +1 Hr
              </button>
              <button
                type="button"
                onClick={() => applyDurationHours(2)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
              >
                +2 Hrs
              </button>
              <button
                type="button"
                onClick={() => applyDurationHours(3)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
              >
                +3 Hrs
              </button>
              <button
                type="button"
                onClick={() => applyDurationHours(4)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
              >
                +4 Hrs
              </button>
              <button
                type="button"
                onClick={applyFullDay}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 hover:text-white border border-indigo-800/60 transition-colors cursor-pointer shrink-0"
              >
                Full Day (9 AM – 6 PM)
              </button>
              <button
                type="button"
                onClick={applyOvernight}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 hover:text-white border border-purple-800/60 transition-colors cursor-pointer shrink-0"
              >
                Overnight (10 PM – 6 AM)
              </button>
              <button
                type="button"
                onClick={apply24Hours}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-emerald-800/60 transition-colors cursor-pointer shrink-0"
              >
                24 Hours Full
              </button>
            </div>

            {/* Live Timeline & Duration Summary Card */}
            {effectiveStart && effectiveEnd && isTimeOrderValid && (
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      {formatSchedulePreview(effectiveStart, effectiveEnd)}
                    </span>
                    <span className="text-[11px] text-indigo-300/80">
                      Total Duration: <strong className="text-white">{formatDuration(durationMs)}</strong>
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider shrink-0 self-start sm:self-center">
                  ✓ Valid Time Slot
                </span>
              </div>
            )}

            {/* Time Validation Warning */}
            {!isTimeOrderValid && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>End date & time must be strictly after start date & time.</span>
              </div>
            )}
          </div>

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
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  Approval Hierarchy
                </p>
                {isLoadingHierarchy ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="animate-spin w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading approval hierarchy...</span>
                  </div>
                ) : approvers.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No approval hierarchy configured for this resource.</p>
                ) : (
                  <ol className="space-y-2.5">
                    {approvers.map((approver, idx) => (
                      <li key={approver.hid} className="flex items-start gap-2.5">
                        {/* Level Badge */}
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {approver.hlevel}
                        </span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-semibold text-slate-200">
                            {approver.roleName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            <span className="text-slate-500">Scope: </span>
                            <span className="text-indigo-300 font-medium">{approver.scopeName}</span>
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
            <li>Select an active role assignment under which you are submitting the request.</li>
            <li>Both start and end dates and times are required.</li>
            <li>Start date selection automatically syncs the end date to the same day.</li>
            <li>You can change the end date at any time for multi-day reservations.</li>
            <li>Use the duration presets to quickly configure your booking slot.</li>
            <li>You can view and track your requests anytime in &ldquo;My Requests&rdquo;.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
