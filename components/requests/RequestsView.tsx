"use client";

import { useState } from "react";
import MakeRequestSection from "./MakeRequestSection";
import MyRequestsSection from "./MyRequestsSection";
import { ResourceItem, RequestRecord } from "./types";

export type { ResourceItem, RequestRecord };

interface RequestsViewProps {
  resources: ResourceItem[];
  initialRequests: RequestRecord[];
  currentUserId: string;
  currentUserName: string;
}

type TabType = "make" | "my";

export default function RequestsView({
  resources,
  initialRequests,
  currentUserId,
  currentUserName,
}: RequestsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("make");

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header and Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Resource Requests
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Book campus facilities, manage booking schedules, and track your request statuses.
          </p>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("make")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "make"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Make Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "my"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>My Requests</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                activeTab === "my"
                  ? "bg-white/20 text-white"
                  : "bg-slate-800 text-slate-300"
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
          onSwitchToMyRequests={() => setActiveTab("my")}
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
