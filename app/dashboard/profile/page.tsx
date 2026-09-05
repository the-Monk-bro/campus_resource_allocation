import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import SignOutButton from "@/components/signOutButton";
import Image from "next/image";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    const userList = await db
        .select()
        .from(users)
        .where(eq(users.email, session?.user?.email!));

    const user = userList[0];

    const userName = user?.name ?? session?.user?.name ?? "User";
    const userEmail = user?.email ?? session?.user?.email ?? "";
    const userImage = user?.image ?? session?.user?.image ?? "";

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            {/* Ambient Background Gradient Glow */}
            <div className="relative w-full max-w-xl">
                <div className="absolute -top-10 -left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Profile Card Container */}
                <div className="relative bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 overflow-hidden">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
                        <div>
                            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                                Campus Account
                            </span>
                        </div>
                        <SignOutButton />
                    </div>

                    {/* User Info Section */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 text-center sm:text-left">
                        {/* Avatar */}
                        {userImage ? (
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-300" />
                                <Image
                                    src={userImage}
                                    alt={userName}
                                    className="relative rounded-full border-2 border-slate-700 shadow-xl object-cover"
                                    width={96}
                                    height={96}
                                    priority
                                />
                            </div>
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        )}

                        {/* Name & Email */}
                        <div className="flex-1 space-y-1 mt-1">
                            <h1 className="text-2xl font-extrabold text-white tracking-tight">
                                {userName}
                            </h1>
                            <p className="text-sm font-medium text-slate-400">
                                {userEmail}
                            </p>
                        </div>
                    </div>

                    {/* Campus Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        {/* Department */}
                        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800/60 backdrop-blur-sm">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                Department
                            </p>
                            <p className="text-sm font-semibold text-slate-100 truncate">
                                {user?.department || "Not specified"}
                            </p>
                        </div>

                        {/* Role */}
                        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800/60 backdrop-blur-sm">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                Role
                            </p>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {user?.role || "Student"}
                            </span>
                        </div>

                        {/* Phone */}
                        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800/60 backdrop-blur-sm">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                Phone
                            </p>
                            <p className="text-sm font-semibold text-slate-100 truncate">
                                {user?.phno || "Not specified"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}