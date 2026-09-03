import { addUser } from "@/actions/UserActions";
import db from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function Page() {
  const userData = await db.select().from(users);

  const totalUsers = userData.length;
  const avgAge =
    totalUsers > 0
      ? Math.round(
        userData.reduce((sum, u) => sum + (u.age ?? 0), 0) / totalUsers
      )
      : 0;

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4m-4-4l4-4m-4 4l-4-4"
                />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Campus Resource Allocation
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            User Directory & Access Management System
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Users</p>
              <p className="text-lg font-bold text-white">{totalUsers}</p>
            </div>
          </div>

          <div className="glass-card px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Avg. Age</p>
              <p className="text-lg font-bold text-white">{avgAge} yrs</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Card */}
        <section className="lg:col-span-4 glass-card p-6 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              Add User
            </h2>
            <span className="text-xs font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-800">
              Server Action
            </span>
          </div>

          <form action={addUser} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Full Name <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="e.g. Alex Morgan"
                required
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="age"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Age <span className="text-indigo-400">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                placeholder="e.g. 24"
                min="1"
                max="120"
                required
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="id"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between"
              >
                <span>Custom ID</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (Optional - Auto Serial)
                </span>
              </label>
              <input
                type="text"
                id="id"
                name="id"
                placeholder="e.g. USR-101 (Auto-generated if blank)"
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Create User Record</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </form>
        </section>

        {/* Right Column: User Table */}
        <section className="lg:col-span-8 glass-card p-6 rounded-3xl space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Registered Users</h2>
              <p className="text-xs text-slate-400">
                Live database entries from PostgreSQL
              </p>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Database Synced
            </span>
          </div>

          {userData.length === 0 ? (
            <div className="py-16 text-center space-y-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
              <div className="h-14 w-14 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-300">
                  No Users Found
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  The users table is currently empty. Use the form on the left to add a record.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Age</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {userData.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-indigo-500/5 transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono text-slate-400 text-xs font-semibold">
                        #{user.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20">
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                              {user.name || "Anonymous User"}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              System User
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {user.age ?? "N/A"} years
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
