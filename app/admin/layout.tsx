import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import SignOutButton from "@/components/signOutButton";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforce server-side guard: only Admin in CRAS scope allowed
  const adminCheck = await requireAdmin();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Left Admin Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0">
        {/* Brand / Admin Header */}
        <div className="p-6 border-b border-slate-800/80 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center font-black text-white shadow-lg shadow-purple-600/30">
              ADM
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-white">CRAS Admin</h2>
              <p className="text-[11px] font-medium text-slate-400">Institutional Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold uppercase tracking-wider">
              Admin Mode (CRAS)
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Admin Console
          </div>

          {/* Overview */}
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Overview</span>
          </Link>

          {/* Allocations */}
          <Link
            href="/admin/allocations"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>All Allocations</span>
          </Link>

          {/* Requests */}
          <Link
            href="/admin/requests"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>All Requests</span>
          </Link>

          {/* Users & Roles */}
          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Users & Roles</span>
          </Link>

          {/* Resources */}
          <Link
            href="/admin/resources"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Resources</span>
          </Link>

          {/* Roles & Scopes */}
          <Link
            href="/admin/roles-scopes"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>Roles & Scopes</span>
          </Link>

          <div className="pt-4 border-t border-slate-800/80">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all"
            >
              <span>← Back to Campus Portal</span>
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <SignOutButton />
          <div className="px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-400">Admin Session</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}

