import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";
import { execSync } from "child_process";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import {
  users,
  resources,
  requests,
  approval_hierarchies,
  approval_steps,
  allocations,
} from "../db/schema";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in environment!");
    process.exit(1);
  }

  console.log("🧹 Clearing database tables and records...");
  const rawSql = postgres(dbUrl, { max: 1 });

  try {
    await rawSql`DROP SCHEMA public CASCADE;`;
    await rawSql`CREATE SCHEMA public;`;
    await rawSql`GRANT ALL ON SCHEMA public TO public;`;
    console.log("✅ Database schema cleared successfully!");
  } catch (error) {
    console.error("⚠️ Error clearing schema:", error);
    process.exit(1);
  } finally {
    await rawSql.end();
  }

  console.log("🚀 Pushing latest schema with drizzle-kit...");
  try {
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    console.log("🎉 Database schema push completed successfully!");
  } catch (error) {
    console.error("❌ Failed to push schema:", error);
    process.exit(1);
  }

  console.log("🌱 Starting fake data seeding...");

  const seedClient = postgres(dbUrl, { max: 5 });
  const db = drizzle(seedClient);

  try {
    // Default password for all seeded accounts
    const defaultHashedPassword = await bcrypt.hash("password123", 10);

    // ── 1. Users ────────────────────────────────────────────────────────────
    console.log("👥 Seeding users...");
    const sampleUsers = [
      {
        id: "usr-admin-01",
        name: "Dr. Rajesh Sharma",
        email: "admin@campus.edu",
        password: defaultHashedPassword,
        department: "Computer Science and Engineering",
        role: "Admin",
        phno: "9876543210",
      },
      {
        id: "usr-student-01",
        name: "Aarav Patel",
        email: "student@campus.edu",
        password: defaultHashedPassword,
        department: "Computer Science and Engineering",
        role: "Student",
        phno: "9812345678",
      },
      {
        id: "usr-faculty-01",
        name: "Prof. Sunita Rao",
        email: "faculty@campus.edu",
        password: defaultHashedPassword,
        department: "Electrical Engineering",
        role: "Professor",
        phno: "9823456789",
      },
      {
        id: "usr-coord-01",
        name: "Rohan Verma",
        email: "coordinator@campus.edu",
        password: defaultHashedPassword,
        department: "Mechanical Engineering",
        role: "Club Coordinator",
        phno: "9834567890",
      },
      {
        id: "usr-gensec-01",
        name: "Ananya Iyer",
        email: "gensec@campus.edu",
        password: defaultHashedPassword,
        department: "Computer Science and Engineering",
        role: "General Secretary",
        phno: "9845678901",
      },
      {
        id: "usr-pres-01",
        name: "Vikram Malhotra",
        email: "president@campus.edu",
        password: defaultHashedPassword,
        department: "Metallurgical Engineering and Materials Science",
        role: "President Gymkhana",
        phno: "9856789012",
      },
      {
        id: "usr-staff-01",
        name: "Manoj Kumar",
        email: "staff@campus.edu",
        password: defaultHashedPassword,
        department: "School of Innovation",
        role: "Staff",
        phno: "9867890123",
      },
      {
        id: "usr-priya-01",
        name: "Priya Sharma",
        email: "priya.sharma@campus.edu",
        password: defaultHashedPassword,
        department: "Mathematics",
        role: "Student",
        phno: "9878901234",
      },
      {
        id: "usr-neha-01",
        name: "Neha Gupta",
        email: "neha.gupta@campus.edu",
        password: defaultHashedPassword,
        department: "Chemistry",
        role: "Senator",
        phno: "9889012345",
      },
      {
        id: "usr-amit-01",
        name: "Prof. Amit Singh",
        email: "amit.singh@campus.edu",
        password: defaultHashedPassword,
        department: "Physics",
        role: "Professor",
        phno: "9890123456",
      },
    ];
    await db.insert(users).values(sampleUsers);
    console.log(`✅ Seeded ${sampleUsers.length} users (default password: "password123").`);

    // ── 2. Resources ────────────────────────────────────────────────────────
    console.log("🏫 Seeding campus resources...");
    const sampleResources = [
      { id: "LH-101", name: "Lecture Hall 101", type: "Lecture Hall", capacity: 150, location: "LH Complex Ground Floor", status: "AVAILABLE" as const },
      { id: "LH-102", name: "Lecture Hall 102", type: "Lecture Hall", capacity: 150, location: "LH Complex Ground Floor", status: "AVAILABLE" as const },
      { id: "LH-201", name: "Lecture Hall 201 (Amphitheater)", type: "Lecture Hall", capacity: 250, location: "LH Complex 1st Floor", status: "AVAILABLE" as const },
      { id: "LAB-CSE-1", name: "Advanced Computing Lab", type: "Computer Lab", capacity: 60, location: "POD-1D 2nd Floor", status: "AVAILABLE" as const },
      { id: "LAB-AI-GPU", name: "AI & GPU Research Center", type: "Computer Lab", capacity: 40, location: "Titanium Building Rm 204", status: "AVAILABLE" as const },
      { id: "AUDI-MAIN", name: "APJ Abdul Kalam Auditorium", type: "Auditorium", capacity: 800, location: "Central Campus Plaza", status: "AVAILABLE" as const },
      { id: "AUDI-MINI", name: "Mini Auditorium B", type: "Auditorium", capacity: 200, location: "Student Activity Center", status: "AVAILABLE" as const },
      { id: "SEMINAR-A", name: "Department Seminar Hall A", type: "Seminar Room", capacity: 80, location: "School of Innovation Wing B", status: "AVAILABLE" as const },
      { id: "SEMINAR-B", name: "International Conference Hall", type: "Seminar Room", capacity: 120, location: "Admin Block 3rd Floor", status: "MAINTENANCE" as const },
      { id: "CR-301", name: "Classroom 301", type: "Classroom", capacity: 50, location: "POD-1A 3rd Floor", status: "AVAILABLE" as const },
      { id: "SPORTS-ARENA", name: "Indoor Sports Complex", type: "Sports Arena", capacity: 300, location: "Gymkhana Sports Zone", status: "AVAILABLE" as const },
      { id: "WORKSHOP-04", name: "Mechanical Fabrication Workshop", type: "Workshop", capacity: 35, location: "Heavy Engineering Shed 4", status: "RETIRED" as const },
    ];
    await db.insert(resources).values(sampleResources);
    console.log(`✅ Seeded ${sampleResources.length} campus resources.`);

    // ── 3. Approval Hierarchies ─────────────────────────────────────────────
    console.log("🏛️  Seeding approval hierarchies...");
    const sampleHierarchies = [
      // Main Auditorium: 2-level approval
      { hid: "H-AUDI-L1",   hlevel: 1, approverid: "usr-admin-01",   resid: "AUDI-MAIN" },
      { hid: "H-AUDI-L2",   hlevel: 2, approverid: "usr-pres-01",    resid: "AUDI-MAIN" },
      // LH-201: single-level
      { hid: "H-LH201-L1",  hlevel: 1, approverid: "usr-faculty-01", resid: "LH-201" },
      // LH-101
      { hid: "H-LH101-L1",  hlevel: 1, approverid: "usr-faculty-01", resid: "LH-101" },
      // LH-102
      { hid: "H-LH102-L1",  hlevel: 1, approverid: "usr-staff-01",   resid: "LH-102" },
      // CSE Lab
      { hid: "H-LABCSE-L1", hlevel: 1, approverid: "usr-admin-01",   resid: "LAB-CSE-1" },
      // AI/GPU Lab
      { hid: "H-AI-L1",     hlevel: 1, approverid: "usr-admin-01",   resid: "LAB-AI-GPU" },
      // Sports Arena: 2-level
      { hid: "H-SPORT-L1",  hlevel: 1, approverid: "usr-gensec-01",  resid: "SPORTS-ARENA" },
      { hid: "H-SPORT-L2",  hlevel: 2, approverid: "usr-pres-01",    resid: "SPORTS-ARENA" },
      // Seminar Hall A
      { hid: "H-SEMA-L1",   hlevel: 1, approverid: "usr-faculty-01", resid: "SEMINAR-A" },
      // Classroom 301
      { hid: "H-CR301-L1",  hlevel: 1, approverid: "usr-faculty-01", resid: "CR-301" },
    ];
    await db.insert(approval_hierarchies).values(sampleHierarchies);
    console.log(`✅ Seeded ${sampleHierarchies.length} approval hierarchies.`);

    // ── 4. Requests ──────────────────────────────────────────────────────────
    console.log("📝 Seeding resource allocation requests...");
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const slot = (dayOffset: number, hour: number, durationHours = 2) => {
      const s = new Date(now.getTime() + dayOffset * dayMs);
      s.setHours(hour, 0, 0, 0);
      const e = new Date(s.getTime() + durationHours * 3600 * 1000);
      return { start: s, end: e };
    };

    const r1 = slot(-3, 10, 4);
    const r2 = slot(-1, 14, 3);
    const r3 = slot(1, 9, 3);
    const r4 = slot(2, 11, 2);
    const r5 = slot(-2, 18, 4);
    const r6 = slot(3, 16, 2);
    const r7 = slot(4, 8, 4);
    const r8 = slot(5, 14, 3);
    const r9 = slot(6, 10, 5);
    const r10 = slot(7, 15, 3);
    const r11 = slot(-1, 17, 3);
    const r12 = slot(8, 10, 2);

    const sampleRequests = [
      { reqid: 1,  requesterid: "usr-student-01", resid: "LH-201",      purpose: "Hackathon 2026 Opening Keynote",               reqtime: new Date(r1.start.getTime() - 2*dayMs), starttime: r1.start, endtime: r1.end,   reqstatus: "APPROVED" as const },
      { reqid: 2,  requesterid: "usr-coord-01",   resid: "AUDI-MAIN",   purpose: "Annual Cultural Fest Grand Rehearsal",          reqtime: new Date(r2.start.getTime() - 3*dayMs), starttime: r2.start, endtime: r2.end,   reqstatus: "APPROVED" as const },
      { reqid: 3,  requesterid: "usr-student-01", resid: "LAB-AI-GPU",  purpose: "Deep Learning Workshop with PyTorch",           reqtime: new Date(now.getTime() - 4*3600*1000),  starttime: r3.start, endtime: r3.end,   reqstatus: "PENDING" as const },
      { reqid: 4,  requesterid: "usr-faculty-01", resid: "SEMINAR-A",   purpose: "Guest Lecture on Quantum Computing",            reqtime: new Date(now.getTime() - 1*dayMs),      starttime: r4.start, endtime: r4.end,   reqstatus: "APPROVED" as const },
      { reqid: 5,  requesterid: "usr-student-01", resid: "LAB-CSE-1",   purpose: "Overnight LAN Gaming Tournament",               reqtime: new Date(r5.start.getTime() - 1*dayMs), starttime: r5.start, endtime: r5.end,   reqstatus: "REJECTED" as const },
      { reqid: 6,  requesterid: "usr-priya-01",   resid: "CR-301",      purpose: "Linear Algebra Peer Tutoring Session",          reqtime: new Date(now.getTime() - 12*3600*1000), starttime: r6.start, endtime: r6.end,   reqstatus: "CANCELLED" as const },
      { reqid: 7,  requesterid: "usr-gensec-01",  resid: "SPORTS-ARENA",purpose: "Inter-Department Badminton Championship",        reqtime: new Date(now.getTime() - 6*3600*1000),  starttime: r7.start, endtime: r7.end,   reqstatus: "PENDING" as const },
      { reqid: 8,  requesterid: "usr-coord-01",   resid: "LH-101",      purpose: "IEEE Student Branch Paper Presentation",         reqtime: new Date(now.getTime() - 2*dayMs),      starttime: r8.start, endtime: r8.end,   reqstatus: "APPROVED" as const },
      { reqid: 9,  requesterid: "usr-staff-01",   resid: "LH-102",      purpose: "Campus Placement Aptitude Test",                 reqtime: new Date(now.getTime() - 1*dayMs),      starttime: r9.start, endtime: r9.end,   reqstatus: "APPROVED" as const },
      { reqid: 10, requesterid: "usr-student-01", resid: "SPORTS-ARENA",purpose: "Robotics Club Drone Navigation Demo",             reqtime: new Date(now.getTime() - 2*3600*1000),  starttime: r10.start, endtime: r10.end, reqstatus: "PENDING" as const },
      { reqid: 11, requesterid: "usr-neha-01",    resid: "SEMINAR-A",   purpose: "Club Social Gathering",                          reqtime: new Date(r11.start.getTime() - 1*dayMs),starttime: r11.start, endtime: r11.end, reqstatus: "REJECTED" as const },
      { reqid: 12, requesterid: "usr-faculty-01", resid: "CR-301",      purpose: "PhD Comprehensive Viva Defense",                  reqtime: new Date(now.getTime() - 18*3600*1000), starttime: r12.start, endtime: r12.end, reqstatus: "APPROVED" as const },
    ];
    await db.insert(requests).values(sampleRequests);
    console.log(`✅ Seeded ${sampleRequests.length} requests.`);

    // ── 5. Approval Steps ────────────────────────────────────────────────────
    console.log("🚦 Seeding approval steps...");
    const sampleApprovalSteps = [
      { hid: "H-LH201-L1",  reqid: 1,  approverid: "usr-faculty-01", issuetime: new Date(r1.start.getTime() - 2*dayMs),      actiontime: new Date(r1.start.getTime() - 2*dayMs + 3600*1000),  shortcomment: "Approved. Microphone and projector reserved.",         approvalstatus: "APPROVED" as const },
      { hid: "H-AUDI-L1",   reqid: 2,  approverid: "usr-admin-01",   issuetime: new Date(r2.start.getTime() - 3*dayMs),      actiontime: new Date(r2.start.getTime() - 3*dayMs + 2*3600*1000), shortcomment: "Approved — stage lighting and audio system booked.",    approvalstatus: "APPROVED" as const },
      { hid: "H-AUDI-L2",   reqid: 2,  approverid: "usr-pres-01",    issuetime: new Date(r2.start.getTime() - 3*dayMs + 3600*1000), actiontime: new Date(r2.start.getTime() - 2*dayMs),         shortcomment: "President approval granted.",                           approvalstatus: "APPROVED" as const },
      { hid: "H-AI-L1",     reqid: 3,  approverid: "usr-admin-01",   issuetime: new Date(now.getTime() - 4*3600*1000),        actiontime: null,                                                  shortcomment: null,                                                    approvalstatus: "PENDING" as const },
      { hid: "H-SEMA-L1",   reqid: 4,  approverid: "usr-faculty-01", issuetime: new Date(now.getTime() - 1*dayMs),            actiontime: new Date(now.getTime() - 1*dayMs + 45*60*1000),       shortcomment: "Approved with guest reception arrangements.",           approvalstatus: "APPROVED" as const },
      { hid: "H-LABCSE-L1", reqid: 5,  approverid: "usr-admin-01",   issuetime: new Date(r5.start.getTime() - 1*dayMs),      actiontime: new Date(r5.start.getTime() - 1*dayMs + 30*60*1000),  shortcomment: "Rejected — labs not permitted for gaming events.",       approvalstatus: "REJECTED" as const },
      { hid: "H-SPORT-L1",  reqid: 7,  approverid: "usr-gensec-01",  issuetime: new Date(now.getTime() - 6*3600*1000),        actiontime: null,                                                  shortcomment: null,                                                    approvalstatus: "PENDING" as const },
      { hid: "H-LH101-L1",  reqid: 8,  approverid: "usr-faculty-01", issuetime: new Date(now.getTime() - 2*dayMs),            actiontime: new Date(now.getTime() - 2*dayMs + 4*3600*1000),      shortcomment: "Approved for IEEE student event.",                      approvalstatus: "APPROVED" as const },
      { hid: "H-LH102-L1",  reqid: 9,  approverid: "usr-staff-01",   issuetime: new Date(now.getTime() - 1*dayMs),            actiontime: new Date(now.getTime() - 1*dayMs + 2*3600*1000),      shortcomment: "Approved for campus placement assessment.",             approvalstatus: "APPROVED" as const },
      { hid: "H-SPORT-L1",  reqid: 10, approverid: "usr-gensec-01",  issuetime: new Date(now.getTime() - 2*3600*1000),        actiontime: null,                                                  shortcomment: null,                                                    approvalstatus: "PENDING" as const },
      { hid: "H-SEMA-L1",   reqid: 11, approverid: "usr-faculty-01", issuetime: new Date(r11.start.getTime() - 1*dayMs),     actiontime: new Date(r11.start.getTime() - 1*dayMs + 2*3600*1000), shortcomment: "Rejected — seminar halls not for personal events.",    approvalstatus: "REJECTED" as const },
      { hid: "H-CR301-L1",  reqid: 12, approverid: "usr-faculty-01", issuetime: new Date(now.getTime() - 18*3600*1000),       actiontime: new Date(now.getTime() - 17*3600*1000),                shortcomment: "Approved for PhD defense committee.",                   approvalstatus: "APPROVED" as const },
    ];
    await db.insert(approval_steps).values(sampleApprovalSteps);
    console.log(`✅ Seeded ${sampleApprovalSteps.length} approval steps.`);

    // ── 6. Allocations ────────────────────────────────────────────────────────
    // NOTE: starttime/endtime removed from allocations table — reference requests table instead
    console.log("📅 Seeding allocations...");
    const sampleAllocations = [
      { allocationid: 1, reqid: 1,  allocationstatus: "COMPLETED" as const },
      { allocationid: 2, reqid: 2,  allocationstatus: "COMPLETED" as const },
      { allocationid: 3, reqid: 4,  allocationstatus: "SCHEDULED" as const },
      { allocationid: 4, reqid: 8,  allocationstatus: "SCHEDULED" as const },
      { allocationid: 5, reqid: 9,  allocationstatus: "SCHEDULED" as const },
      { allocationid: 6, reqid: 12, allocationstatus: "SCHEDULED" as const },
    ];
    await db.insert(allocations).values(sampleAllocations);
    console.log(`✅ Seeded ${sampleAllocations.length} allocations.`);

    console.log("\n🎉 Database reset and seeding completed successfully!");
    console.log("-------------------------------------------------------");
    console.log("Demo Credentials (all accounts use password: password123):");
    console.log("  • Admin:       admin@campus.edu");
    console.log("  • Student:     student@campus.edu");
    console.log("  • Professor:   faculty@campus.edu");
    console.log("  • Coordinator: coordinator@campus.edu");
    console.log("  • GenSec:      gensec@campus.edu");
    console.log("  • President:   president@campus.edu");
    console.log("-------------------------------------------------------");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await seedClient.end();
  }
}

main();
