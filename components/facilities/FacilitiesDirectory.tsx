"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface FacilityItem {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
  confirmedAllocations: number;
}

interface FacilitiesDirectoryProps {
  facilities: FacilityItem[];
}

export default function FacilitiesDirectory({ facilities }: FacilitiesDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Extract unique facility types
  const types = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => {
      if (f.type) set.add(f.type);
    });
    return Array.from(set).sort();
  }, [facilities]);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      // Type filter
      if (selectedType !== "ALL" && f.type !== selectedType) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "ALL" && f.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesId = f.id.toLowerCase().includes(q);
        const matchesLocation = f.location ? f.location.toLowerCase().includes(q) : false;
        const matchesType = f.type ? f.type.toLowerCase().includes(q) : false;
        return matchesName || matchesId || matchesLocation || matchesType;
      }
      return true;
    });
  }, [facilities, selectedType, selectedStatus, searchQuery]);

  // Quick stats
  const totalCapacity = useMemo(() => {
    return facilities.reduce((sum, f) => sum + (f.capacity || 0), 0);
  }, [facilities]);

  const availableCount = useMemo(() => {
    return facilities.filter((f) => f.status === "AVAILABLE").length;
  }, [facilities]);

  const getTypeBadgeStyle = (type: string | null) => {
    switch (type) {
      case "Computer Lab":
        return "bg-purple-500/10 text-purple-400 border-purple-500/25";
      case "Lecture Hall":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/25";
      case "Auditorium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/25";
      case "Sports Arena":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      case "Seminar Room":
        return "bg-sky-500/10 text-sky-400 border-sky-500/25";
      case "Classroom":
        return "bg-blue-500/10 text-blue-400 border-blue-500/25";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Stat Pills ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Facilities
          </span>
          <span className="text-2xl font-black text-white mt-1 block">
            {facilities.length}
          </span>
          <span className="text-[11px] text-slate-500">Across campus venues</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Available Now
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {availableCount}
          </span>
          <span className="text-[11px] text-slate-500">Ready for booking</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
            Total Seating
          </span>
          <span className="text-2xl font-black text-indigo-300 mt-1 block">
            {totalCapacity.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500">Total capacity</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
            Facility Types
          </span>
          <span className="text-2xl font-black text-purple-300 mt-1 block">
            {types.length}
          </span>
          <span className="text-[11px] text-slate-500">Distinct categories</span>
        </div>
      </div>

      {/* ── Filter and Search Controls ─────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        {/* Search Bar & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name, ID (e.g. LH-101), location, or type..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Status:</span>
            {(["ALL", "AVAILABLE", "MAINTENANCE"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedStatus === st
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {st === "ALL" ? "All Status" : st === "AVAILABLE" ? "Available" : "Maintenance"}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
          <span className="text-xs text-slate-400 font-medium mr-2">Category:</span>
          <button
            type="button"
            onClick={() => setSelectedType("ALL")}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              selectedType === "ALL"
                ? "bg-slate-700 text-white"
                : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            All Categories ({facilities.length})
          </button>
          {types.map((t) => {
            const count = facilities.filter((f) => f.type === t).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  selectedType === t
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Facilities Grid ────────────────────────────────────────────── */}
      {filteredFacilities.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-300">No matching facilities found</p>
          <p className="text-xs text-slate-500">
            Try adjusting your search criteria or reset filters to view all facilities.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedType("ALL");
              setSelectedStatus("ALL");
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white font-semibold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFacilities.map((fac) => {
            const isAvailable = fac.status === "AVAILABLE";
            return (
              <div
                key={fac.id}
                className="group relative rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/90 p-5 space-y-4 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-indigo-500/5"
              >
                {/* Top Info Bar */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                      {fac.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {fac.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {fac.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {fac.type && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getTypeBadgeStyle(
                            fac.type
                          )}`}
                        >
                          {fac.type}
                        </span>
                      )}
                      {fac.capacity && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{fac.capacity} Seats</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {fac.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{fac.location}</span>
                    </div>
                  )}

                  {fac.confirmedAllocations > 0 && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/40 px-2.5 py-1 rounded-lg border border-slate-800/60 flex items-center justify-between">
                      <span>Confirmed Schedules</span>
                      <strong className="text-indigo-400 font-semibold">{fac.confirmedAllocations} active</strong>
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 border-t border-slate-800/80">
                  {isAvailable ? (
                    <Link
                      href={`/dashboard/requests?resourceId=${fac.id}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                    >
                      <span>Book This Facility</span>
                      <span>→</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 text-slate-500 font-semibold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <span>Facility In Maintenance</span>
                    </button>
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

