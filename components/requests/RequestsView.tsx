"use client";

import { useState, useEffect } from "react";
import MakeRequestSection from "./MakeRequestSection";
import MyRequestsSection from "./MyRequestsSection";
import { ResourceItem, RequestRecord, UserActiveRoleAssignment } from "./types";
import { CalendarPlus, ClipboardList } from "lucide-react";

export type { ResourceItem, RequestRecord, UserActiveRoleAssignment };

interface RequestsViewProps {
  resources: ResourceItem[];
  initialRequests: RequestRecord[];
  activeAssignments?: UserActiveRoleAssignment[];
  currentUserId: string;
  currentUserName: string;
  defaultTab?: "make" | "my";
  defaultResourceId?: string;
}

type TabType = "make" | "my";

export default function RequestsView({
  resources,
  initialRequests,
  activeAssignments = [],
  currentUserId,
  currentUserName,
  defaultTab = "make",
  defaultResourceId,
}: RequestsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header and Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Resource Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Book campus venues, manage schedules, and track multi-tier approval progress.
          </p>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("make")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "make"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Make Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "my"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
            <span>My Requests</span>
            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                activeTab === "my"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {initialRequests.length}
            </span>
          </button>
        </div>
      </div>

      {/* Render Respective Section Component */}
      {activeTab === "make" ? (
        <MakeRequestSection
          resources={resources}
          activeAssignments={activeAssignments}
          onSwitchToMyRequests={() => setActiveTab("my")}
          defaultResourceId={defaultResourceId}
        />
      ) : (
        <MyRequestsSection
          requests={initialRequests}
          onMakeNewRequest={() => setActiveTab("make")}
        />
      )}
    </div>
  );
}
