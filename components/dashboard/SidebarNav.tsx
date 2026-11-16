"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  CheckSquare2,
  CalendarRange,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface SidebarNavProps {
  isAdmin?: boolean;
}

export default function SidebarNav({ isAdmin = false }: SidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Facilities Directory",
      href: "/dashboard/facilities",
      icon: Building2,
    },
    {
      label: "My Requests",
      href: "/dashboard/requests",
      icon: ClipboardList,
    },
    {
      label: "Approvals Worklist",
      href: "/dashboard/approvals",
      icon: CheckSquare2,
    },
    {
      label: "My Allocations",
      href: "/dashboard/allocations",
      icon: CalendarRange,
    },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        Workspace
      </div>

      <div className="space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${active
                ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${active
                  ? "text-indigo-600"
                  : "text-slate-400 group-hover:text-slate-600"
                  }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <div className="pt-4 mt-3 border-t border-slate-100">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-purple-600 uppercase flex items-center justify-between">
            <span>Governance</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded">
              CRAS
            </span>
          </div>

          <Link
            href="/admin"
            className="flex items-center justify-between px-3 py-2 mt-1 rounded-lg text-sm font-medium text-purple-900 bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/60 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Admin Console</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </nav>
  );
}

