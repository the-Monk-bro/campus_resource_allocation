import { requireAdmin } from "@/lib/admin";
import SignOutButton from "@/components/signOutButton";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce server-side guard: only Admin in CRAS scope allowed
  await requireAdmin();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Left Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0">
        {/* Brand / Admin Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm tracking-tight text-slate-900">
                  CRAS Admin
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200/60 px-1 py-0.2 rounded">
                  Root
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Campus Governance
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <AdminSidebarNav />

        {/* Sidebar Footer with Sign Out */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/60">
          <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium text-purple-700">Scope: CRAS</span>
            <span className="text-[10px] font-mono text-slate-400">ADMIN</span>
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
