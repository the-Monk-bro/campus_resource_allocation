import SignOutButton from "@/components/signOutButton";
import { checkIsAdmin } from "@/lib/admin";
import SidebarNav from "@/components/dashboard/SidebarNav";
import { Building } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin } = await checkIsAdmin();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0">
        {/* Brand / Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm tracking-tight text-slate-900">
                  CRAS
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1 py-0.2 rounded">
                  Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Campus Resource System
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <SidebarNav isAdmin={isAdmin} />

        {/* Sidebar Footer with Sign Out */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/60">
          <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-slate-700">IIT Indore</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CS257</span>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  );
}
