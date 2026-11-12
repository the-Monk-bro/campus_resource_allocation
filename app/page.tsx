import AuthCard from "@/components/AuthCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* ── Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/25">
              CRA
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white block leading-tight">
                CRAS <span className="text-indigo-400 font-normal text-xs sm:text-sm">Portal</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
                Campus Resource Allocation System
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-300">
            <a href="#problem-solution" className="hover:text-indigo-400 transition-colors">
              Why CRAS
            </a>
            <a href="#how-it-works" className="hover:text-indigo-400 transition-colors">
              How It Works
            </a>
            <a href="#facilities" className="hover:text-indigo-400 transition-colors">
              Facilities
            </a>
            <a href="#architecture" className="hover:text-indigo-400 transition-colors">
              Architecture
            </a>
            <a href="#demo-accounts" className="hover:text-indigo-400 transition-colors">
              Demo Logins
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Online</span>
            </div>
            <a
              href="#login-section"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/30"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[450px] h-[350px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Value Proposition (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Next-Gen Campus Infrastructure</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Smart, Conflict-Free <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                  Campus Resource
                </span>{" "}
                Allocation
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Eliminate paper registers, scheduling clashes, and opaque approvals. A unified, database-governed portal for booking lecture halls, AI research labs, and auditoriums with automated multi-tier role authorization.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>100% Conflict-Free (ACID Locks)</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Hierarchical State Triggers</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Dynamic Role & Scope RBAC</span>
                </div>
              </div>

              {/* Action Buttons & Quick Stats */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <a
                  href="#login-section"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all text-center"
                >
                  Enter Portal &rarr;
                </a>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white font-semibold text-sm transition-colors text-center"
                >
                  See How It Works
                </a>
              </div>

              {/* Live Metric Stats */}
              <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-black text-white">12+</div>
                  <div className="text-xs text-slate-400 font-medium">Campus Facilities</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-indigo-400">100%</div>
                  <div className="text-xs text-slate-400 font-medium">Overlap Prevention</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-purple-400">&lt; 1s</div>
                  <div className="text-xs text-slate-400 font-medium">Trigger Cascade</div>
                </div>
              </div>
            </div>

            {/* Right Column: Portal Access Card (5 Cols) */}
            <div id="login-section" className="lg:col-span-5 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-100 transition duration-1000 -z-10" />
              <div className="relative">
                <AuthCard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem & Solution Comparison ─────────────────────────────── */}
      <section id="problem-solution" className="py-20 border-t border-slate-900 bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              The Campus Challenge
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Why Traditional Booking Systems Break Down
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Universities host hundreds of student clubs, departments, and visiting symposiums daily. Manual paper slips and shared spreadsheets lead to chaos. Here is how CRAS solves it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Double-Bookings & Clashes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Two clubs book the main auditorium simultaneously due to delayed paper logs, causing last-minute event disruptions and embarrassment.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>ACID Row-Locking Guarantee</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Stalled Signatures</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Approval forms wait for days on professors&apos; desks. Students have no visibility into whose desk their application is stuck on.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Sequential Status Tracking</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Complex Co-Ownership</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A single person is simultaneously a Math TA, Robotics Club Coordinator, and ME student. Single-role portals cannot express this.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Role &amp; Scope Decoupling</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Untracked Approvals</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When an emergency room change or rejection occurs, there is zero verifiable record of who approved it or under which capacity.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Audited Decision Logging</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Workflow Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              How Allocation Works in 4 Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              From submission to reservation, database triggers and stored procedures orchestrate the lifecycle automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 relative group hover:border-slate-700 transition-all">
              <span className="text-4xl font-black text-indigo-500/20 group-hover:text-indigo-500/40 transition-colors block mb-2">
                01
              </span>
              <h3 className="text-base font-bold text-white mb-2">Select Resource &amp; Role</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose from campus facilities (LH, Labs, Auditoriums). Select which active role assignment you are requesting under (e.g. <em>HOD – CSE</em> or <em>Club Coordinator – Coding Club</em>).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 relative group hover:border-slate-700 transition-all">
              <span className="text-4xl font-black text-purple-500/20 group-hover:text-purple-500/40 transition-colors block mb-2">
                02
              </span>
              <h3 className="text-base font-bold text-white mb-2">Pipeline Dispatch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                CRAS matches the required approval hierarchy. The pending request is automatically broadcast to all authorized co-approvers holding the required role and scope.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 relative group hover:border-slate-700 transition-all">
              <span className="text-4xl font-black text-pink-500/20 group-hover:text-pink-500/40 transition-colors block mb-2">
                03
              </span>
              <h3 className="text-base font-bold text-white mb-2">Sequential Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Co-approvers review and act with comments. Database triggers strictly enforce that Level 2 cannot approve until Level 1 has cleared.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 relative group hover:border-slate-700 transition-all">
              <span className="text-4xl font-black text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors block mb-2">
                04
              </span>
              <h3 className="text-base font-bold text-white mb-2">Instant Allocation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upon final sign-off, MySQL triggers automatically set the request status to <strong>APPROVED</strong> and create a locked booking record in <strong>allocations</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Facilities Showcase ───────────────────────────────────────── */}
      <section id="facilities" className="py-20 border-t border-slate-900 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Campus Infrastructure
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Pre-Configured Campus Facilities
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Built to manage high-demand campus real estate across academic wings, computing clusters, and student zones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Facility Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Lecture Hall Complex
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">LH-101 / 201</span>
              </div>
              <h3 className="text-lg font-bold text-white">Lecture Halls &amp; Amphitheaters</h3>
              <p className="text-xs text-slate-400">
                150 to 250 capacity tiered halls equipped with laser projectors, surround sound, and integrated lecture recording stations.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3">
                <span>Cap: 150–250</span>
                <span>•</span>
                <span>LH Complex Ground/1st Fl</span>
              </div>
            </div>

            {/* Facility Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  High-Performance Computing
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">LAB-AI-GPU</span>
              </div>
              <h3 className="text-lg font-bold text-white">AI &amp; GPU Research Center</h3>
              <p className="text-xs text-slate-400">
                Dedicated research workstations with multi-GPU acceleration, high-throughput compute cluster access, and biometric entry.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3">
                <span>Cap: 40 Researchers</span>
                <span>•</span>
                <span>Titanium Building Rm 204</span>
              </div>
            </div>

            {/* Facility Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Grand Auditorium
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">AUDI-MAIN</span>
              </div>
              <h3 className="text-lg font-bold text-white">APJ Abdul Kalam Auditorium</h3>
              <p className="text-xs text-slate-400">
                800-seat central auditorium for annual cultural festivals, international symposiums, and convocation ceremonies.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3">
                <span>Cap: 800 Seats</span>
                <span>•</span>
                <span>Central Campus Plaza</span>
              </div>
            </div>

            {/* Facility Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Computing Lab
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">LAB-CSE-1</span>
              </div>
              <h3 className="text-lg font-bold text-white">Advanced Computing Lab</h3>
              <p className="text-xs text-slate-400">
                60-workstation departmental computer laboratory for laboratory examinations, hackathons, and software engineering courses.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3">
                <span>Cap: 60 Seats</span>
                <span>•</span>
                <span>POD-1D 2nd Floor</span>
              </div>
            </div>

            {/* Facility Card 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Recreation &amp; Athletics
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">SPORTS-ARENA</span>
              </div>
              <h3 className="text-lg font-bold text-white">Indoor Sports Complex</h3>
              <p className="text-xs text-slate-400">
                Badminton courts, table tennis stations, basketball arena, and spectator bleachers under Gymkhana Sports governance.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3">
                <span>Cap: 300 Persons</span>
                <span>•</span>
                <span>Gymkhana Sports Zone</span>
              </div>
            </div>

            {/* Facility Card 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Conference &amp; Seminar
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">SEMINAR-A</span>
              </div>
              <h3 className="text-lg font-bold text-white">Department Seminar Hall A</h3>
              <p className="text-xs text-slate-400">
                80-seat conference setup with video conferencing equipment, executive seating, and reception lobby for defense vivas.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3">
                <span>Cap: 80 Persons</span>
                <span>•</span>
                <span>School of Innovation Wing B</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture & Engineering Highlights ─────────────────────── */}
      <section id="architecture" className="py-20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Database-Centric Engineering
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Business Logic Enforced by the MySQL Engine
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Unlike fragile client-heavy web applications, CRAS delegates transactional consistency, state machine progression, and concurrency safety directly to MySQL 8.0.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-sm">
                    🔒
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Pessimistic Concurrency Locking</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Row-level locks (<code>SELECT ... FOR UPDATE</code>) ensure overlapping submissions can never slip past validation.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 font-bold text-sm">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Autonomous Trigger State Machine</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <code>AFTER UPDATE</code> triggers automatically cascade approval steps, update parent request status, and generate allocation slots.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-sm">
                    🛡️
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Strict Sequential Constraints</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <code>BEFORE UPDATE</code> triggers verify hierarchy compliance via <code>SIGNAL SQLSTATE &apos;45000&apos;</code> to prevent out-of-order decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 font-mono text-xs shadow-2xl overflow-x-auto text-slate-300">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800 text-slate-500 text-[11px]">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 text-slate-400">cras_trigger_execution.sql</span>
                </div>
                <pre className="text-indigo-300 leading-relaxed">
{`-- Automated Trigger Firing on Final Approval
UPDATE approval_steps
SET approvalstatus = 'APPROVED',
    actiontime = NOW(),
    ActionByUserId = 'usr-admin-01'
WHERE reqid = 10 AND hid = 'H-SPORT-L1';

-- MySQL Engine Automatically Executes:
>> TRIGGER trg_approval_step_after_update FIRED
>> Checking remaining steps: 0 found.
>> UPDATE requests SET reqstatus = 'APPROVED'
>> INSERT INTO allocations (reqid, 'SCHEDULED')
>> Transaction Committed Successfully.`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo Accounts / Evaluator Quick Access ────────────────────── */}
      <section id="demo-accounts" className="py-20 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Evaluator &amp; Demo Testing
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pre-Configured Demo Credentials
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Use any of these pre-seeded accounts to explore request creation, approval workflows, and role governance. Password for all: <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-bold border border-slate-800">password123</code>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Dr. Rajesh Sharma</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  HOD – CSE
                </span>
              </div>
              <p className="text-slate-400 font-mono">admin@campus.edu</p>
              <p className="text-[11px] text-slate-500">Approver for CSE Labs &amp; Auditorium Level 1</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Prof. Sunita Rao</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  HOD – EE &amp; Advisor
                </span>
              </div>
              <p className="text-slate-400 font-mono">faculty@campus.edu</p>
              <p className="text-[11px] text-slate-500">Approver for Lecture Halls &amp; Seminar Rooms</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Vikram Malhotra</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Gymkhana President
                </span>
              </div>
              <p className="text-slate-400 font-mono">president@campus.edu</p>
              <p className="text-[11px] text-slate-500">Final Level Approver for Auditorium &amp; Sports</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Rohan Verma</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Club Coordinator
                </span>
              </div>
              <p className="text-slate-400 font-mono">coordinator@campus.edu</p>
              <p className="text-[11px] text-slate-500">Coding Club Lead &amp; Mechanical Engineering Student</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Aarav Patel</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Student &amp; TA
                </span>
              </div>
              <p className="text-slate-400 font-mono">student@campus.edu</p>
              <p className="text-[11px] text-slate-500">CSE Student &amp; Teaching Assistant for CS257</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Ananya Iyer</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  General Secretary
                </span>
              </div>
              <p className="text-slate-400 font-mono">gensec@campus.edu</p>
              <p className="text-[11px] text-slate-500">Approver for Sports Arena &amp; Institute Facilities</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-slate-900 text-center text-xs text-slate-500 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
            CRA
          </div>
          <span className="font-bold text-slate-400">Campus Resource Allocation System</span>
        </div>
        <p>
          Built for the Database &amp; Information Systems Course. Powered by Next.js 16, React 19, Tailwind CSS 4 &amp; MySQL 8.0.
        </p>
        <p className="text-slate-600">
          &copy; 2026 CRAS Portal. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
