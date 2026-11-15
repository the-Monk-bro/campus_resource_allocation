"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  MapPin,
  CalendarCheck,
  Building,
  ArrowRight,
  Filter,
} from "lucide-react";

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

export default function FacilitiesDirectory({
  facilities,
}: FacilitiesDirectoryProps) {
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
        const matchesLocation = f.location
          ? f.location.toLowerCase().includes(q)
          : false;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Maintenance
          </span>
        );
      case "RETIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Retired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Stat Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="saas-card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Facilities
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {facilities.length}
          </span>
          <span className="text-xs text-slate-400">Campus venues</span>
        </div>

        <div className="saas-card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Operational
          </span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">
            {availableCount}
          </span>
          <span className="text-xs text-slate-400">Ready to reserve</span>
        </div>

        <div className="saas-card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Cumulative Capacity
          </span>
          <span className="text-2xl font-bold text-indigo-600 mt-1 block">
            {totalCapacity.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">Total campus seats</span>
        </div>

        <div className="saas-card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Venue Categories
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {types.length}
          </span>
          <span className="text-xs text-slate-400">Labs, halls, arenas</span>
        </div>
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────────── */}
      <div className="saas-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name, ID, or location..."
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors cursor-pointer"
            >
              <option value="ALL">All Categories ({facilities.length})</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>

        {/* Results Count & Reset */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredFacilities.length}</strong> of {facilities.length} venues
          </span>
          {(searchQuery || selectedType !== "ALL" || selectedStatus !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Facilities Grid ───────────────────────────────────────────── */}
      {filteredFacilities.length === 0 ? (
        <div className="saas-card p-12 text-center space-y-3">
          <Building className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">
            No campus facilities match your filters
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, selecting another category, or resetting all filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFacilities.map((f) => (
            <div
              key={f.id}
              className="saas-card p-5 space-y-3 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                    {f.id}
                  </span>
                  {getStatusBadge(f.status)}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {f.name}
                  </h3>
                  <span className="inline-block text-xs font-medium text-slate-500 mt-0.5">
                    {f.type ?? "General Facility"}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Capacity:{" "}
                      <strong className="text-slate-900 font-semibold">
                        {f.capacity ? `${f.capacity} seats` : "N/A"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{f.location ?? "Campus Zone"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Active Bookings:{" "}
                      <strong className="text-slate-900 font-semibold">
                        {f.confirmedAllocations}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                {f.status === "AVAILABLE" ? (
                  <Link
                    href={`/dashboard/requests?resid=${encodeURIComponent(f.id)}`}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Request Booking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed text-center"
                  >
                    Unavailable for Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
