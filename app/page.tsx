import AuthCard from "@/components/AuthCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { UserRow } from "@/lib/types/db";
import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Lock,
  CalendarCheck,
  Users,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    try {
      const [rows] = await pool.execute<UserRow[]>(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [session.user.email]
      );
      if (rows && rows.length > 0) {
        redirect("/dashboard");
      }
    } catch (err: any) {
      if (err?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      console.error("Session user check error:", err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* ── Top Institutional Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  CRAS
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded">
                  IIT Indore
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                Campus Resource Allocation System
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Platform Features
            </a>
            <a href="#workflow" className="hover:text-indigo-600 transition-colors">
              Workflow Engine
            </a>
            <a href="#database-core" className="hover:text-indigo-600 transition-colors">
              DBMS Engine
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>System Operational</span>
            </div>
            <a
              href="#login-section"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Value Proposition (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>CS257: Database-First Architecture</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Intelligent, Conflict-Free <br className="hidden sm:block" />
                <span className="text-indigo-600">Campus Resource</span> Allocation
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Eliminate scheduling clashes, paper approvals, and stalled signatures.
                CRAS provides a unified, database-governed platform for booking auditoriums,
                GPU labs, and seminar halls with automated multi-tier approval state machines.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pessimistic Concurrency (FOR UPDATE)</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Trigger State Machine</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Role &amp; Scope Access Control</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <a
                  href="#login-section"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Enter Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#workflow"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm transition-colors text-center"
                >
                  Explore Workflow
                </a>
              </div>

              {/* Quick Metrics */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-bold text-slate-900">Multi-Tier</div>
                  <div className="text-xs text-slate-500">Approval Chains</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">100%</div>
                  <div className="text-xs text-slate-500">Zero Overlaps</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">15 min</div>
                  <div className="text-xs text-slate-500">Lifecycle Sweep</div>
                </div>
              </div>
            </div>

            {/* Right Column: Portal Access Card (5 Cols) */}
            <div id="login-section" className="lg:col-span-5">
              <AuthCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem & Solution Comparison ─────────────────────────────── */}
      <section id="features" className="py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Institutional Governance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for Real Campus Complexity
            </h2>
            <p className="text-sm text-slate-600">
              Campuses host dozens of student clubs, research departments, and external events.
              Traditional booking forms fail under concurrency; CRAS resolves this at the database level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="saas-card p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Double-Booking Defense</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pessimistic row locking (`SELECT FOR UPDATE`) and database triggers prevent race conditions when two users click book simultaneously.
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ACID Row Serialization</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="saas-card p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Sequential Hierarchies</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Multi-level approval state machine (`trg_enforce_sequential_approval`) ensures Level 2 approvers cannot approve before Level 1 clearance.
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Trigger State Machine</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="saas-card p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Role &amp; Scope Decoupling</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Users hold multiple temporal role assignments across distinct departments (e.g. Professor in EE and Advisor to Coding Club).
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Temporal Role Mappings</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="saas-card p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-bold">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Automated Lifecycle</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                MySQL Event Scheduler sweeps every 15 minutes, automatically transitioning allocations from Scheduled to Ongoing to Completed.
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Background Event Daemon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow Engine Section ───────────────────────────────────── */}
      <section id="workflow" className="py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              End-to-End Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How a Booking Request Progresses
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold font-mono text-indigo-600">01</span>
              <h4 className="text-sm font-semibold text-slate-900">Requester Submits</h4>
              <p className="text-xs text-slate-600">
                User selects facility, time slot, and acting assignment. Stored procedure acquires exclusive row lock.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold font-mono text-indigo-600">02</span>
              <h4 className="text-sm font-semibold text-slate-900">Collision &amp; Hierarchy</h4>
              <p className="text-xs text-slate-600">
                Database checks overlaps against confirmed allocations and pending requests, then seeds approval steps.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold font-mono text-indigo-600">03</span>
              <h4 className="text-sm font-semibold text-slate-900">Sequential Sign-Offs</h4>
              <p className="text-xs text-slate-600">
                Authorized approvers review in their worklist. Trigger enforces strict order and blocks tampering.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold font-mono text-indigo-600">04</span>
              <h4 className="text-sm font-semibold text-slate-900">Auto-Allocation</h4>
              <p className="text-xs text-slate-600">
                Final approval trigger immediately promotes request to Approved and generates confirmed allocation row.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DBMS Engine Highlights ────────────────────────────────────── */}
      <section id="database-core" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Technical Rigor
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Powered by MySQL 8.0 Storage Engine
            </h2>
            <p className="text-sm text-slate-600">
              Built for CS257 Database Systems: Zero ORM abstraction, 3NF/BCNF normalization,
              declarative CHECK constraints, and 6 relational views.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-slate-900">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>6 Relational Views</span>
              </div>
              <p className="text-xs text-slate-600">
                Pre-computed projections (`vw_resource_utilization`, `vw_request_pipeline`, `vw_pending_approvals`) for high-performance dashboard reads.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-slate-900">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>ACID Concurrency</span>
              </div>
              <p className="text-xs text-slate-600">
                Deadlock (1213) and lock timeout (1205) detection with automatic exponential backoff retries in dedicated MySQL connection pools.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Declarative Constraints</span>
              </div>
              <p className="text-xs text-slate-600">
                Domain CHECK constraints for temporal validity (`endtime &gt; starttime`), phone number regex, and strict foreign key restrict actions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="py-8 bg-slate-50 border-t border-slate-200/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">CRAS</span>
            <span>&middot;</span>
            <span>Campus Resource Allocation System</span>
            <span>&middot;</span>
            <span>IIT Indore</span>
          </div>
          <div className="flex items-center gap-4">
            <span>CS257: Database Systems</span>
            <a href="#login-section" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Back to Sign In &uarr;
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
