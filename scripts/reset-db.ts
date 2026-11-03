import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

async function main() {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "campus_resource_allocation";

  console.log(`🔌 Connecting to MySQL server at ${host}:${port}...`);

  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Failed to connect to MySQL server:", message);
    process.exit(1);
  }

  try {
    console.log(`🧹 Ensuring database \`${database}\` exists and resetting tables...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.changeUser({ database });

    await connection.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS \`allocations\`;
      DROP TABLE IF EXISTS \`approval_steps\`;
      DROP TABLE IF EXISTS \`approval_hierarchies\`;
      DROP TABLE IF EXISTS \`requests\`;
      DROP TABLE IF EXISTS \`role_assignments\`;
      DROP TABLE IF EXISTS \`scopes\`;
      DROP TABLE IF EXISTS \`roles\`;
      DROP TABLE IF EXISTS \`resources\`;
      DROP TABLE IF EXISTS \`verificationToken\`;
      DROP TABLE IF EXISTS \`session\`;
      DROP TABLE IF EXISTS \`account\`;
      DROP TABLE IF EXISTS \`users\`;
      SET FOREIGN_KEY_CHECKS = 1;
    `);
    console.log("✅ Database tables dropped successfully!");

    console.log("🚀 Applying schema from schema.sql...");
    const schemaSql = fs.readFileSync(path.join(process.cwd(), "schema.sql"), "utf-8");
    await connection.query(schemaSql);
    console.log("🎉 Database schema applied successfully!");

    console.log("🌱 Starting seed data insertion...");
    const defaultHashedPassword = await bcrypt.hash("password123", 10);

    // ── 1. Users (No role, no department) ───────────────────────────────────
    console.log("👥 Seeding users...");
    const sampleUsers = [
      {
        id: "usr-admin-01",
        name: "Dr. Rajesh Sharma",
        email: "admin@campus.edu",
        password: defaultHashedPassword,
        phno: "9876543210",
      },
      {
        id: "usr-student-01",
        name: "Aarav Patel",
        email: "student@campus.edu",
        password: defaultHashedPassword,
        phno: "9812345678",
      },
      {
        id: "usr-faculty-01",
        name: "Prof. Sunita Rao",
        email: "faculty@campus.edu",
        password: defaultHashedPassword,
        phno: "9823456789",
      },
      {
        id: "usr-coord-01",
        name: "Rohan Verma",
        email: "coordinator@campus.edu",
        password: defaultHashedPassword,
        phno: "9834567890",
      },
      {
        id: "usr-gensec-01",
        name: "Ananya Iyer",
        email: "gensec@campus.edu",
        password: defaultHashedPassword,
        phno: "9845678901",
      },
      {
        id: "usr-pres-01",
        name: "Vikram Malhotra",
        email: "president@campus.edu",
        password: defaultHashedPassword,
        phno: "9856789012",
      },
      {
        id: "usr-staff-01",
        name: "Manoj Kumar",
        email: "staff@campus.edu",
        password: defaultHashedPassword,
        phno: "9867890123",
      },
      {
        id: "usr-priya-01",
        name: "Priya Sharma",
        email: "priya.sharma@campus.edu",
        password: defaultHashedPassword,
        phno: "9878901234",
      },
      {
        id: "usr-neha-01",
        name: "Neha Gupta",
        email: "neha.gupta@campus.edu",
        password: defaultHashedPassword,
        phno: "9889012345",
      },
      {
        id: "usr-amit-01",
        name: "Prof. Amit Singh",
        email: "amit.singh@campus.edu",
        password: defaultHashedPassword,
        phno: "9890123456",
      },
    ];

    for (const u of sampleUsers) {
      await connection.execute(
        `INSERT INTO users (id, name, email, password, phno) VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, u.password, u.phno]
      );
    }
    console.log(`✅ Seeded ${sampleUsers.length} users (default password: "password123").`);

    // ── 2. Roles ────────────────────────────────────────────────────────────
    console.log("🏷️  Seeding roles...");
    const sampleRoles = [
      { RoleId: "ROLE-HOD",         RoleName: "Head of Department" },
      { RoleId: "ROLE-PROF",        RoleName: "Professor" },
      { RoleId: "ROLE-FACULTY-ADV", RoleName: "Faculty Advisor" },
      { RoleId: "ROLE-STUDENT",     RoleName: "Student" },
      { RoleId: "ROLE-TA",          RoleName: "Teaching Assistant" },
      { RoleId: "ROLE-COORD",       RoleName: "Club Coordinator" },
      { RoleId: "ROLE-GENSEC",      RoleName: "General Secretary" },
      { RoleId: "ROLE-PRES",        RoleName: "Gymkhana President" },
      { RoleId: "ROLE-STAFF",       RoleName: "Staff Member" },
      { RoleId: "ROLE-SENATOR",     RoleName: "Student Senator" },
    ];

    for (const r of sampleRoles) {
      await connection.execute(
        `INSERT INTO roles (RoleId, RoleName) VALUES (?, ?)`,
        [r.RoleId, r.RoleName]
      );
    }
    console.log(`✅ Seeded ${sampleRoles.length} generic roles.`);

    // ── 3. Scopes ───────────────────────────────────────────────────────────
    console.log("🌐 Seeding scopes...");
    const sampleScopes = [
      { ScopeId: "SCOPE-CSE",          ScopeName: "Computer Science and Engineering", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-EE",           ScopeName: "Electrical Engineering",           ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-ME",           ScopeName: "Mechanical Engineering",           ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-MEMS",         ScopeName: "Materials Science & Engineering",  ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-MATH",         ScopeName: "Mathematics",                      ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-PHY",          ScopeName: "Physics",                          ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-CHEM",         ScopeName: "Chemistry",                        ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-SOI",          ScopeName: "School of Innovation",             ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-MA101",        ScopeName: "MA101 - Calculus",                 ScopeType: "COURSE" },
      { ScopeId: "SCOPE-CS257",        ScopeName: "CS257 - Database Systems",         ScopeType: "COURSE" },
      { ScopeId: "SCOPE-CODING-CLUB",  ScopeName: "Coding Club",                      ScopeType: "CLUB" },
      { ScopeId: "SCOPE-ROBOTICS-CLUB",ScopeName: "Robotics Club",                    ScopeType: "CLUB" },
      { ScopeId: "SCOPE-INSTITUTE",    ScopeName: "Institute Administration",         ScopeType: "INSTITUTE" },
    ];

    for (const s of sampleScopes) {
      await connection.execute(
        `INSERT INTO scopes (ScopeId, ScopeName, ScopeType) VALUES (?, ?, ?)`,
        [s.ScopeId, s.ScopeName, s.ScopeType]
      );
    }
    console.log(`✅ Seeded ${sampleScopes.length} scopes.`);

    // ── 4. Role Assignments ─────────────────────────────────────────────────
    console.log("🔗 Seeding role assignments...");
    const sampleAssignments = [
      // Dr. Rajesh Sharma - HOD of CSE
      { AssignmentId: 1,  UserId: "usr-admin-01",   RoleId: "ROLE-HOD",         ScopeId: "SCOPE-CSE",          ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      // Prof. Sunita Rao - HOD of EE and Faculty Advisor for Coding Club
      { AssignmentId: 2,  UserId: "usr-faculty-01", RoleId: "ROLE-HOD",         ScopeId: "SCOPE-EE",           ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 3,  UserId: "usr-faculty-01", RoleId: "ROLE-FACULTY-ADV", ScopeId: "SCOPE-CODING-CLUB",  ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      // Vikram Malhotra - Gymkhana President
      { AssignmentId: 4,  UserId: "usr-pres-01",    RoleId: "ROLE-PRES",        ScopeId: "SCOPE-INSTITUTE",    ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      // Ananya Iyer - General Secretary
      { AssignmentId: 5,  UserId: "usr-gensec-01",  RoleId: "ROLE-GENSEC",      ScopeId: "SCOPE-INSTITUTE",    ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      // Manoj Kumar - Staff Member in School of Innovation
      { AssignmentId: 6,  UserId: "usr-staff-01",   RoleId: "ROLE-STAFF",       ScopeId: "SCOPE-SOI",          ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      // Rohan Verma - Club Coordinator (Coding Club) & Student (Mechanical)
      { AssignmentId: 7,  UserId: "usr-coord-01",   RoleId: "ROLE-COORD",       ScopeId: "SCOPE-CODING-CLUB",  ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 8,  UserId: "usr-coord-01",   RoleId: "ROLE-STUDENT",     ScopeId: "SCOPE-ME",           ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      // Aarav Patel - Student (CSE) & Teaching Assistant (CS257)
      { AssignmentId: 9,  UserId: "usr-student-01", RoleId: "ROLE-STUDENT",     ScopeId: "SCOPE-CSE",          ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      { AssignmentId: 10, UserId: "usr-student-01", RoleId: "ROLE-TA",          ScopeId: "SCOPE-CS257",        ValidFrom: "2026-01-01 00:00:00", ValidUntil: null },
      // Priya Sharma - Teaching Assistant (CS257 - Multiple users sharing TA role) & Student (Math)
      { AssignmentId: 11, UserId: "usr-priya-01",   RoleId: "ROLE-TA",          ScopeId: "SCOPE-CS257",        ValidFrom: "2026-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 12, UserId: "usr-priya-01",   RoleId: "ROLE-STUDENT",     ScopeId: "SCOPE-MATH",         ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      // Neha Gupta - Student (Chemistry)
      { AssignmentId: 13, UserId: "usr-neha-01",    RoleId: "ROLE-STUDENT",     ScopeId: "SCOPE-CHEM",         ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      // Prof. Amit Singh - HOD of Physics
      { AssignmentId: 14, UserId: "usr-amit-01",    RoleId: "ROLE-HOD",         ScopeId: "SCOPE-PHY",          ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      // Historical / Expired assignments (to test past responsibilities display)
      { AssignmentId: 15, UserId: "usr-student-01", RoleId: "ROLE-TA",          ScopeId: "SCOPE-MA101",        ValidFrom: "2025-01-01 00:00:00", ValidUntil: "2025-12-31 23:59:59" },
      { AssignmentId: 16, UserId: "usr-coord-01",   RoleId: "ROLE-COORD",       ScopeId: "SCOPE-ROBOTICS-CLUB",ValidFrom: "2025-01-01 00:00:00", ValidUntil: "2025-12-31 23:59:59" },
    ];

    for (const ra of sampleAssignments) {
      await connection.execute(
        `INSERT INTO role_assignments (AssignmentId, UserId, RoleId, ScopeId, ValidFrom, ValidUntil)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ra.AssignmentId, ra.UserId, ra.RoleId, ra.ScopeId, ra.ValidFrom, ra.ValidUntil]
      );
    }
    console.log(`✅ Seeded ${sampleAssignments.length} role assignments.`);

    // ── 5. Resources ────────────────────────────────────────────────────────
    console.log("🏫 Seeding campus resources...");
    const sampleResources = [
      { id: "LH-101", name: "Lecture Hall 101", type: "Lecture Hall", capacity: 150, location: "LH Complex Ground Floor", status: "AVAILABLE" },
      { id: "LH-102", name: "Lecture Hall 102", type: "Lecture Hall", capacity: 150, location: "LH Complex Ground Floor", status: "AVAILABLE" },
      { id: "LH-201", name: "Lecture Hall 201 (Amphitheater)", type: "Lecture Hall", capacity: 250, location: "LH Complex 1st Floor", status: "AVAILABLE" },
      { id: "LAB-CSE-1", name: "Advanced Computing Lab", type: "Computer Lab", capacity: 60, location: "POD-1D 2nd Floor", status: "AVAILABLE" },
      { id: "LAB-AI-GPU", name: "AI & GPU Research Center", type: "Computer Lab", capacity: 40, location: "Titanium Building Rm 204", status: "AVAILABLE" },
      { id: "AUDI-MAIN", name: "APJ Abdul Kalam Auditorium", type: "Auditorium", capacity: 800, location: "Central Campus Plaza", status: "AVAILABLE" },
      { id: "AUDI-MINI", name: "Mini Auditorium B", type: "Auditorium", capacity: 200, location: "Student Activity Center", status: "AVAILABLE" },
      { id: "SEMINAR-A", name: "Department Seminar Hall A", type: "Seminar Room", capacity: 80, location: "School of Innovation Wing B", status: "AVAILABLE" },
      { id: "SEMINAR-B", name: "International Conference Hall", type: "Seminar Room", capacity: 120, location: "Admin Block 3rd Floor", status: "MAINTENANCE" },
      { id: "CR-301", name: "Classroom 301", type: "Classroom", capacity: 50, location: "POD-1A 3rd Floor", status: "AVAILABLE" },
      { id: "SPORTS-ARENA", name: "Indoor Sports Complex", type: "Sports Arena", capacity: 300, location: "Gymkhana Sports Zone", status: "AVAILABLE" },
      { id: "WORKSHOP-04", name: "Mechanical Fabrication Workshop", type: "Workshop", capacity: 35, location: "Heavy Engineering Shed 4", status: "RETIRED" },
    ];

    for (const r of sampleResources) {
      await connection.execute(
        `INSERT INTO resources (id, name, type, capacity, location, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.type, r.capacity, r.location, r.status]
      );
    }
    console.log(`✅ Seeded ${sampleResources.length} campus resources.`);

    // ── 6. Approval Hierarchies (RoleId, ScopeId) ───────────────────────────
    console.log("🏛️  Seeding approval hierarchies with Role & Scope...");
    const sampleHierarchies = [
      { hid: "H-AUDI-L1",   hlevel: 1, resid: "AUDI-MAIN",    roleId: "ROLE-HOD",    scopeId: "SCOPE-CSE" },
      { hid: "H-AUDI-L2",   hlevel: 2, resid: "AUDI-MAIN",    roleId: "ROLE-PRES",   scopeId: "SCOPE-INSTITUTE" },
      { hid: "H-LH201-L1",  hlevel: 1, resid: "LH-201",       roleId: "ROLE-HOD",    scopeId: "SCOPE-EE" },
      { hid: "H-LH101-L1",  hlevel: 1, resid: "LH-101",       roleId: "ROLE-HOD",    scopeId: "SCOPE-EE" },
      { hid: "H-LH102-L1",  hlevel: 1, resid: "LH-102",       roleId: "ROLE-STAFF",  scopeId: "SCOPE-SOI" },
      { hid: "H-LABCSE-L1", hlevel: 1, resid: "LAB-CSE-1",    roleId: "ROLE-HOD",    scopeId: "SCOPE-CSE" },
      { hid: "H-AI-L1",     hlevel: 1, resid: "LAB-AI-GPU",   roleId: "ROLE-HOD",    scopeId: "SCOPE-CSE" },
      { hid: "H-SPORT-L1",  hlevel: 1, resid: "SPORTS-ARENA", roleId: "ROLE-GENSEC", scopeId: "SCOPE-INSTITUTE" },
      { hid: "H-SPORT-L2",  hlevel: 2, resid: "SPORTS-ARENA", roleId: "ROLE-PRES",   scopeId: "SCOPE-INSTITUTE" },
      { hid: "H-SEMA-L1",   hlevel: 1, resid: "SEMINAR-A",    roleId: "ROLE-HOD",    scopeId: "SCOPE-EE" },
      { hid: "H-CR301-L1",  hlevel: 1, resid: "CR-301",       roleId: "ROLE-HOD",    scopeId: "SCOPE-EE" },
    ];

    for (const h of sampleHierarchies) {
      await connection.execute(
        `INSERT INTO approval_hierarchies (hid, hlevel, resid, RoleId, ScopeId) VALUES (?, ?, ?, ?, ?)`,
        [h.hid, h.hlevel, h.resid, h.roleId, h.scopeId]
      );
    }
    console.log(`✅ Seeded ${sampleHierarchies.length} approval hierarchies.`);

    // ── 7. Requests (with RequesterAssignmentId) ─────────────────────────────
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
      { reqid: 1,  requesterid: "usr-student-01", assignmentId: 9,  resid: "LH-201",      purpose: "Hackathon 2026 Opening Keynote",               reqtime: new Date(r1.start.getTime() - 2*dayMs), starttime: r1.start, endtime: r1.end,   reqstatus: "APPROVED" },
      { reqid: 2,  requesterid: "usr-coord-01",   assignmentId: 7,  resid: "AUDI-MAIN",   purpose: "Annual Cultural Fest Grand Rehearsal",          reqtime: new Date(r2.start.getTime() - 3*dayMs), starttime: r2.start, endtime: r2.end,   reqstatus: "APPROVED" },
      { reqid: 3,  requesterid: "usr-student-01", assignmentId: 10, resid: "LAB-AI-GPU",  purpose: "Deep Learning Workshop with PyTorch",           reqtime: new Date(now.getTime() - 4*3600*1000),  starttime: r3.start, endtime: r3.end,   reqstatus: "PENDING" },
      { reqid: 4,  requesterid: "usr-faculty-01", assignmentId: 2,  resid: "SEMINAR-A",   purpose: "Guest Lecture on Quantum Computing",            reqtime: new Date(now.getTime() - 1*dayMs),      starttime: r4.start, endtime: r4.end,   reqstatus: "APPROVED" },
      { reqid: 5,  requesterid: "usr-student-01", assignmentId: 9,  resid: "LAB-CSE-1",   purpose: "Overnight LAN Gaming Tournament",               reqtime: new Date(r5.start.getTime() - 1*dayMs), starttime: r5.start, endtime: r5.end,   reqstatus: "REJECTED" },
      { reqid: 6,  requesterid: "usr-priya-01",   assignmentId: 12, resid: "CR-301",      purpose: "Linear Algebra Peer Tutoring Session",          reqtime: new Date(now.getTime() - 12*3600*1000), starttime: r6.start, endtime: r6.end,   reqstatus: "CANCELLED" },
      { reqid: 7,  requesterid: "usr-gensec-01",  assignmentId: 5,  resid: "SPORTS-ARENA",purpose: "Inter-Department Badminton Championship",        reqtime: new Date(now.getTime() - 6*3600*1000),  starttime: r7.start, endtime: r7.end,   reqstatus: "PENDING" },
      { reqid: 8,  requesterid: "usr-coord-01",   assignmentId: 7,  resid: "LH-101",      purpose: "IEEE Student Branch Paper Presentation",         reqtime: new Date(now.getTime() - 2*dayMs),      starttime: r8.start, endtime: r8.end,   reqstatus: "APPROVED" },
      { reqid: 9,  requesterid: "usr-staff-01",   assignmentId: 6,  resid: "LH-102",      purpose: "Campus Placement Aptitude Test",                 reqtime: new Date(now.getTime() - 1*dayMs),      starttime: r9.start, endtime: r9.end,   reqstatus: "APPROVED" },
      { reqid: 10, requesterid: "usr-student-01", assignmentId: 9,  resid: "SPORTS-ARENA",purpose: "Robotics Club Drone Navigation Demo",             reqtime: new Date(now.getTime() - 2*3600*1000),  starttime: r10.start, endtime: r10.end, reqstatus: "PENDING" },
      { reqid: 11, requesterid: "usr-neha-01",    assignmentId: 13, resid: "SEMINAR-A",   purpose: "Club Social Gathering",                          reqtime: new Date(r11.start.getTime() - 1*dayMs),starttime: r11.start, endtime: r11.end, reqstatus: "REJECTED" },
      { reqid: 12, requesterid: "usr-faculty-01", assignmentId: 2,  resid: "CR-301",      purpose: "PhD Comprehensive Viva Defense",                  reqtime: new Date(now.getTime() - 18*3600*1000), starttime: r12.start, endtime: r12.end, reqstatus: "APPROVED" },
    ];

    for (const req of sampleRequests) {
      await connection.execute(
        `INSERT INTO requests (reqid, requesterid, RequesterAssignmentId, resid, purpose, reqtime, starttime, endtime, reqstatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.reqid, req.requesterid, req.assignmentId, req.resid, req.purpose, req.reqtime, req.starttime, req.endtime, req.reqstatus]
      );
    }
    console.log(`✅ Seeded ${sampleRequests.length} requests.`);

    // ── 8. Approval Steps (approverid, ActionByUserId, ActionAsAssignmentId) ─
    console.log("🚦 Seeding approval steps with audit details...");
    const sampleApprovalSteps = [
      { hid: "H-LH201-L1",  reqid: 1,  approverid: "usr-faculty-01", actionByUserId: "usr-faculty-01", actionAsAssignmentId: 2, issuetime: new Date(r1.start.getTime() - 2*dayMs),      actiontime: new Date(r1.start.getTime() - 2*dayMs + 3600*1000),  shortcomment: "Approved. Microphone and projector reserved.",         approvalstatus: "APPROVED" },
      { hid: "H-AUDI-L1",   reqid: 2,  approverid: "usr-admin-01",   actionByUserId: "usr-admin-01",   actionAsAssignmentId: 1, issuetime: new Date(r2.start.getTime() - 3*dayMs),      actiontime: new Date(r2.start.getTime() - 3*dayMs + 2*3600*1000), shortcomment: "Approved — stage lighting and audio system booked.",    approvalstatus: "APPROVED" },
      { hid: "H-AUDI-L2",   reqid: 2,  approverid: "usr-pres-01",    actionByUserId: "usr-pres-01",    actionAsAssignmentId: 4, issuetime: new Date(r2.start.getTime() - 3*dayMs + 3600*1000), actiontime: new Date(r2.start.getTime() - 2*dayMs),         shortcomment: "President approval granted.",                           approvalstatus: "APPROVED" },
      { hid: "H-AI-L1",     reqid: 3,  approverid: "usr-admin-01",   actionByUserId: null,             actionAsAssignmentId: null, issuetime: new Date(now.getTime() - 4*3600*1000),        actiontime: null,                                                  shortcomment: null,                                                    approvalstatus: "PENDING" },
      { hid: "H-SEMA-L1",   reqid: 4,  approverid: "usr-faculty-01", actionByUserId: "usr-faculty-01", actionAsAssignmentId: 2, issuetime: new Date(now.getTime() - 1*dayMs),            actiontime: new Date(now.getTime() - 1*dayMs + 45*60*1000),       shortcomment: "Approved with guest reception arrangements.",           approvalstatus: "APPROVED" },
      { hid: "H-LABCSE-L1", reqid: 5,  approverid: "usr-admin-01",   actionByUserId: "usr-admin-01",   actionAsAssignmentId: 1, issuetime: new Date(r5.start.getTime() - 1*dayMs),      actiontime: new Date(r5.start.getTime() - 1*dayMs + 30*60*1000),  shortcomment: "Rejected — labs not permitted for gaming events.",       approvalstatus: "REJECTED" },
      { hid: "H-SPORT-L1",  reqid: 7,  approverid: "usr-gensec-01",  actionByUserId: null,             actionAsAssignmentId: null, issuetime: new Date(now.getTime() - 6*3600*1000),        actiontime: null,                                                  shortcomment: null,                                                    approvalstatus: "PENDING" },
      { hid: "H-LH101-L1",  reqid: 8,  approverid: "usr-faculty-01", actionByUserId: "usr-faculty-01", actionAsAssignmentId: 2, issuetime: new Date(now.getTime() - 2*dayMs),            actiontime: new Date(now.getTime() - 2*dayMs + 4*3600*1000),      shortcomment: "Approved for IEEE student event.",                      approvalstatus: "APPROVED" },
      { hid: "H-LH102-L1",  reqid: 9,  approverid: "usr-staff-01",   actionByUserId: "usr-staff-01",   actionAsAssignmentId: 6, issuetime: new Date(now.getTime() - 1*dayMs),            actiontime: new Date(now.getTime() - 1*dayMs + 2*3600*1000),      shortcomment: "Approved for campus placement assessment.",             approvalstatus: "APPROVED" },
      { hid: "H-SPORT-L1",  reqid: 10, approverid: "usr-gensec-01",  actionByUserId: null,             actionAsAssignmentId: null, issuetime: new Date(now.getTime() - 2*3600*1000),        actiontime: null,                                                  shortcomment: null,                                                    approvalstatus: "PENDING" },
      { hid: "H-SEMA-L1",   reqid: 11, approverid: "usr-faculty-01", actionByUserId: "usr-faculty-01", actionAsAssignmentId: 2, issuetime: new Date(r11.start.getTime() - 1*dayMs),     actiontime: new Date(r11.start.getTime() - 1*dayMs + 2*3600*1000), shortcomment: "Rejected — seminar halls not for personal events.",    approvalstatus: "REJECTED" },
      { hid: "H-CR301-L1",  reqid: 12, approverid: "usr-faculty-01", actionByUserId: "usr-faculty-01", actionAsAssignmentId: 2, issuetime: new Date(now.getTime() - 18*3600*1000),       actiontime: new Date(now.getTime() - 17*3600*1000),                shortcomment: "Approved for PhD defense committee.",                   approvalstatus: "APPROVED" },
    ];

    for (const s of sampleApprovalSteps) {
      await connection.execute(
        `INSERT INTO approval_steps (hid, reqid, approverid, ActionByUserId, ActionAsAssignmentId, issuetime, actiontime, shortcomment, approvalstatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.hid, s.reqid, s.approverid, s.actionByUserId, s.actionAsAssignmentId, s.issuetime, s.actiontime, s.shortcomment, s.approvalstatus]
      );
    }
    console.log(`✅ Seeded ${sampleApprovalSteps.length} approval steps.`);

    // ── 9. Allocations ───────────────────────────────────────────────────────
    console.log("📅 Seeding allocations...");
    const sampleAllocations = [
      { allocationid: 1, reqid: 1,  allocationstatus: "COMPLETED" },
      { allocationid: 2, reqid: 2,  allocationstatus: "COMPLETED" },
      { allocationid: 3, reqid: 4,  allocationstatus: "SCHEDULED" },
      { allocationid: 4, reqid: 8,  allocationstatus: "SCHEDULED" },
      { allocationid: 5, reqid: 9,  allocationstatus: "SCHEDULED" },
      { allocationid: 6, reqid: 12, allocationstatus: "SCHEDULED" },
    ];

    for (const a of sampleAllocations) {
      await connection.execute(
        `INSERT INTO allocations (allocationid, reqid, allocationstatus) VALUES (?, ?, ?)`,
        [a.allocationid, a.reqid, a.allocationstatus]
      );
    }
    console.log(`✅ Seeded ${sampleAllocations.length} allocations.`);

    console.log("\n🎉 Database reset and seeding completed successfully!");
    console.log("-------------------------------------------------------");
    console.log("Demo Credentials (all accounts use password: password123):");
    console.log("  • Admin (HOD - CSE):                admin@campus.edu");
    console.log("  • Student (CSE & TA CS257):          student@campus.edu");
    console.log("  • Faculty (HOD - EE & Advisor):      faculty@campus.edu");
    console.log("  • Coordinator (Coding Club & ME):    coordinator@campus.edu");
    console.log("  • GenSec (Institute):                gensec@campus.edu");
    console.log("  • President (Gymkhana):              president@campus.edu");
    console.log("  • Staff (School of Innovation):      staff@campus.edu");
    console.log("  • TA & Student (Math & CS257):       priya.sharma@campus.edu");
    console.log("-------------------------------------------------------");
  } catch (error) {
    console.error("❌ Error during database reset and seeding:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
