"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50/80 border border-transparent hover:border-rose-200/60 transition-all cursor-pointer"
      title="Sign out of CRAS Portal"
    >
      <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
      <span>Sign Out</span>
    </button>
  );
}
