import Link from "next/link";
import SignOutButton from "@/components/signOutButton";
import { checkIsAdmin } from "@/lib/admin";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAdmin } = await checkIsAdmin();

    return (
        <div className="min-h-screen flex bg-slate-950 text-slate-100">
            {/* Left Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0">
                {/* Brand / Header */}
                <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                        CRA
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-tight text-white">CRAS Portal</h2>
                        <p className="text-[11px] font-medium text-slate-400">Campus Allocations</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                        Navigation
                    </div>

                    {/* Dashboard */}
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
                    >
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Dashboard</span>
                    </Link>

                    {/* Facilities */}
                    <Link
                        href="/dashboard/facilities"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
                    >
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Facilities</span>
                    </Link>

                    {/* Requests */}
                    <Link
                        href="/dashboard/requests"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
                    >
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Requests</span>
                    </Link>

                    {/* Approvals */}
                    <Link
                        href="/dashboard/approvals"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
                    >
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Approvals</span>
                    </Link>

                    {/* Allocation */}
                    <Link
                        href="/dashboard/allocations"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all group"
                    >
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Allocations</span>
                    </Link>

                    {/* Conditional Admin Portal Link for Authorized Admin (CRAS) */}
                    {isAdmin && (
                        <div className="pt-3 mt-3 border-t border-slate-800/80">
                            <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                                Institutional Admin
                            </div>
                            <Link
                                href="/admin"
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-purple-200 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 transition-all group shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <span>Admin Portal</span>
                                </div>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/40">
                                    CRAS
                                </span>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Sidebar Footer with Sign Out */}
                <div className="p-4 border-t border-slate-800/80 space-y-2">
                    <SignOutButton />
                    <div className="px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium text-slate-400">@IIT Indore</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto min-h-screen">
                {children}
            </main>
        </div>
    );
}