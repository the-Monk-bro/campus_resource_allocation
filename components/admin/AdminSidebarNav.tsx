"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  ClipboardList,
  Users,
  Building2,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

export default function AdminSidebarNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "All Allocations",
      href: "/admin/allocations",
      icon: CalendarRange,
    },
    {
      label: "All Requests",
      href: "/admin/requests",
      icon: ClipboardList,
    },
    {
      label: "Users & Roles",
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Resources & Levels",
      href: "/admin/resources",
      icon: Building2,
    },
    {
      label: "Roles & Scopes",
      href: "/admin/roles-scopes",
      icon: ShieldAlert,
    },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        Admin Console
      </div>

      <div className="space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? "bg-purple-50 text-purple-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active
                    ? "text-purple-600"
                    : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-4 mt-3 border-t border-slate-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to User Portal</span>
        </Link>
      </div>
    </nav>
  );
}

