import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

function splitSqlStatements(sqlText: string): string[] {
  const lines = sqlText.split(/\r?\n/);
  const statements: string[] = [];
  let currentDelimiter = ";";
  let currentStatement = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith("DELIMITER")) {
      const parts = trimmed.split(/\s+/);
      if (parts[1]) {
        currentDelimiter = parts[1];
      }
      continue;
    }

    if (currentDelimiter !== ";" && line.includes(currentDelimiter)) {
      const parts = line.split(currentDelimiter);
      currentStatement += parts[0];
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      currentStatement = parts.slice(1).join(currentDelimiter);
    } else if (currentDelimiter === ";" && line.includes(";")) {
      const parts = line.split(";");
      currentStatement += parts[0];
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      currentStatement = parts.slice(1).join(";");
    } else {
      currentStatement += line + "\n";
    }
  }

  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements.filter((s) => s.length > 0);
}

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

    // ── Apply Stored Procedures & Triggers ─────────────────────────────────
    const triggerFiles = ["triggers_approval.sql", "triggers_workflow.sql"];
    for (const file of triggerFiles) {
      const triggersPath = path.join(process.cwd(), "sql", file);
      if (fs.existsSync(triggersPath)) {
        console.log(`⚡ Applying workflow triggers from sql/${file}...`);
        const triggersSql = fs.readFileSync(triggersPath, "utf-8");
        for (const stmt of splitSqlStatements(triggersSql)) {
          await connection.query(stmt);
        }
        console.log(`✅ Workflow triggers from ${file} applied successfully!`);
        break;
      }
    }

    const proceduresPath = path.join(process.cwd(), "sql", "procedures_approval.sql");
    if (fs.existsSync(proceduresPath)) {
      console.log("📦 Applying approval procedures from sql/procedures_approval.sql...");
      const proceduresSql = fs.readFileSync(proceduresPath, "utf-8");
      for (const stmt of splitSqlStatements(proceduresSql)) {
        await connection.query(stmt);
      }
      console.log("✅ Approval procedures applied successfully!");
    }

    // Apply integrity rules: overlap trigger, stored functions, cleanup procedure and event
    const integrityPath = path.join(process.cwd(), "sql", "integrity.sql");
    if (fs.existsSync(integrityPath)) {
      console.log("Applying integrity rules from sql/integrity.sql...");
      const integritySql = fs.readFileSync(integrityPath, "utf-8");
      for (const stmt of splitSqlStatements(integritySql)) {
        await connection.query(stmt);
      }
      console.log("Integrity trigger, functions, procedure and event applied successfully!");

      try {
        await connection.query("SET GLOBAL event_scheduler = ON");
      } catch {
        console.warn("Could not turn on the event scheduler. Run this yourself: SET GLOBAL event_scheduler = ON;");
      }
    }

    const requestProceduresPath = path.join(process.cwd(), "sql", "procedures_request.sql");
    if (fs.existsSync(requestProceduresPath)) {
      console.log("📦 Applying request procedures from sql/procedures_request.sql...");
      const requestProceduresSql = fs.readFileSync(requestProceduresPath, "utf-8");
      for (const stmt of splitSqlStatements(requestProceduresSql)) {
        await connection.query(stmt);
      }
      console.log("✅ Request procedures applied successfully!");
    }

    console.log("🌱 Starting minimal seed...");
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
      {
        id: "usr-cras-admin",
        name: "CRAS Administrator",
        email: "admin.cras@campus.edu",
        password: defaultHashedPassword,
        phno: "9999888877",
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
      { RoleId: "ROLE-HOD", RoleName: "Head of Department" },
      { RoleId: "ROLE-PROF", RoleName: "Professor" },
      { RoleId: "ROLE-FACULTY-ADV", RoleName: "Faculty Advisor" },
      { RoleId: "ROLE-STUDENT", RoleName: "Student" },
      { RoleId: "ROLE-TA", RoleName: "Teaching Assistant" },
      { RoleId: "ROLE-COORD", RoleName: "Club Coordinator" },
      { RoleId: "ROLE-GENSEC", RoleName: "General Secretary" },
      { RoleId: "ROLE-PRES", RoleName: "Gymkhana President" },
      { RoleId: "ROLE-STAFF", RoleName: "Staff Member" },
      { RoleId: "ROLE-SENATOR", RoleName: "Student Senator" },
      { RoleId: "ROLE-ADMIN", RoleName: "Admin" },
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
      { ScopeId: "SCOPE-CSE", ScopeName: "Computer Science and Engineering", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-EE", ScopeName: "Electrical Engineering", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-ME", ScopeName: "Mechanical Engineering", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-MEMS", ScopeName: "Materials Science & Engineering", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-MATH", ScopeName: "Mathematics", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-PHY", ScopeName: "Physics", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-CHEM", ScopeName: "Chemistry", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-SOI", ScopeName: "School of Innovation", ScopeType: "DEPARTMENT" },
      { ScopeId: "SCOPE-MA101", ScopeName: "MA101 - Calculus", ScopeType: "COURSE" },
      { ScopeId: "SCOPE-CS257", ScopeName: "CS257 - Database Systems", ScopeType: "COURSE" },
      { ScopeId: "SCOPE-CODING-CLUB", ScopeName: "Coding Club", ScopeType: "CLUB" },
      { ScopeId: "SCOPE-ROBOTICS-CLUB", ScopeName: "Robotics Club", ScopeType: "CLUB" },
      { ScopeId: "SCOPE-INSTITUTE", ScopeName: "Institute Administration", ScopeType: "INSTITUTE" },
      { ScopeId: "SCOPE-CRAS", ScopeName: "CRAS", ScopeType: "INSTITUTE" },
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
      { AssignmentId: 1, UserId: "usr-admin-01", RoleId: "ROLE-HOD", ScopeId: "SCOPE-CSE", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 2, UserId: "usr-faculty-01", RoleId: "ROLE-HOD", ScopeId: "SCOPE-EE", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 3, UserId: "usr-faculty-01", RoleId: "ROLE-FACULTY-ADV", ScopeId: "SCOPE-CODING-CLUB", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 4, UserId: "usr-pres-01", RoleId: "ROLE-PRES", ScopeId: "SCOPE-INSTITUTE", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 5, UserId: "usr-gensec-01", RoleId: "ROLE-GENSEC", ScopeId: "SCOPE-INSTITUTE", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 6, UserId: "usr-staff-01", RoleId: "ROLE-STAFF", ScopeId: "SCOPE-SOI", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 7, UserId: "usr-coord-01", RoleId: "ROLE-COORD", ScopeId: "SCOPE-CODING-CLUB", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 8, UserId: "usr-coord-01", RoleId: "ROLE-STUDENT", ScopeId: "SCOPE-ME", ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      { AssignmentId: 9, UserId: "usr-student-01", RoleId: "ROLE-STUDENT", ScopeId: "SCOPE-CSE", ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      { AssignmentId: 10, UserId: "usr-student-01", RoleId: "ROLE-TA", ScopeId: "SCOPE-CS257", ValidFrom: "2026-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 11, UserId: "usr-priya-01", RoleId: "ROLE-TA", ScopeId: "SCOPE-CS257", ValidFrom: "2026-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 12, UserId: "usr-priya-01", RoleId: "ROLE-STUDENT", ScopeId: "SCOPE-MATH", ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      { AssignmentId: 13, UserId: "usr-neha-01", RoleId: "ROLE-STUDENT", ScopeId: "SCOPE-CHEM", ValidFrom: "2024-08-01 00:00:00", ValidUntil: null },
      { AssignmentId: 14, UserId: "usr-amit-01", RoleId: "ROLE-HOD", ScopeId: "SCOPE-PHY", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
      { AssignmentId: 15, UserId: "usr-student-01", RoleId: "ROLE-TA", ScopeId: "SCOPE-MA101", ValidFrom: "2025-01-01 00:00:00", ValidUntil: "2025-12-31 23:59:59" },
      { AssignmentId: 16, UserId: "usr-coord-01", RoleId: "ROLE-COORD", ScopeId: "SCOPE-ROBOTICS-CLUB", ValidFrom: "2025-01-01 00:00:00", ValidUntil: "2025-12-31 23:59:59" },
      { AssignmentId: 17, UserId: "usr-cras-admin", RoleId: "ROLE-ADMIN", ScopeId: "SCOPE-CRAS", ValidFrom: "2025-01-01 00:00:00", ValidUntil: null },
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
      { hid: "H-AUDI-L1", hlevel: 1, resid: "AUDI-MAIN", roleId: "ROLE-HOD", scopeId: "SCOPE-CSE" },
      { hid: "H-AUDI-L2", hlevel: 2, resid: "AUDI-MAIN", roleId: "ROLE-PRES", scopeId: "SCOPE-INSTITUTE" },
      { hid: "H-LH201-L1", hlevel: 1, resid: "LH-201", roleId: "ROLE-HOD", scopeId: "SCOPE-EE" },
      { hid: "H-LH101-L1", hlevel: 1, resid: "LH-101", roleId: "ROLE-HOD", scopeId: "SCOPE-EE" },
      { hid: "H-LH102-L1", hlevel: 1, resid: "LH-102", roleId: "ROLE-STAFF", scopeId: "SCOPE-SOI" },
      { hid: "H-LABCSE-L1", hlevel: 1, resid: "LAB-CSE-1", roleId: "ROLE-HOD", scopeId: "SCOPE-CSE" },
      { hid: "H-AI-L1", hlevel: 1, resid: "LAB-AI-GPU", roleId: "ROLE-HOD", scopeId: "SCOPE-CSE" },
      { hid: "H-SPORT-L1", hlevel: 1, resid: "SPORTS-ARENA", roleId: "ROLE-GENSEC", scopeId: "SCOPE-INSTITUTE" },
      { hid: "H-SPORT-L2", hlevel: 2, resid: "SPORTS-ARENA", roleId: "ROLE-PRES", scopeId: "SCOPE-INSTITUTE" },
      { hid: "H-SEMA-L1", hlevel: 1, resid: "SEMINAR-A", roleId: "ROLE-HOD", scopeId: "SCOPE-EE" },
      { hid: "H-CR301-L1", hlevel: 1, resid: "CR-301", roleId: "ROLE-HOD", scopeId: "SCOPE-EE" },
    ];

    for (const h of sampleHierarchies) {
      await connection.execute(
        `INSERT INTO approval_hierarchies (hid, hlevel, resid, RoleId, ScopeId) VALUES (?, ?, ?, ?, ?)`,
        [h.hid, h.hlevel, h.resid, h.roleId, h.scopeId]
      );
    }
    console.log(`✅ Seeded ${sampleHierarchies.length} approval hierarchies.`);

    console.log("\n🎉 Database reset and minimal seeding completed!");
    console.log("-------------------------------------------------------");
    console.log("Seeded tables:");
    console.log("  • users (no role, no department)");
    console.log("  • roles");
    console.log("  • scopes");
    console.log("  • role_assignments");
    console.log("  • resources");
    console.log("  • approval_hierarchies (with RoleId, ScopeId)");
    console.log("");
    console.log("NOT seeded (clean operational slate):");
    console.log("  • requests");
    console.log("  • approval_steps");
    console.log("  • allocations");
    console.log("-------------------------------------------------------");
    console.log('Default password for all seeded users: "password123"');
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
