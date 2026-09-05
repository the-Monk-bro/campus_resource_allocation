"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-semibold rounded-md text-white transition-colors"
        >
            Sign Out
        </button>
    );
}
