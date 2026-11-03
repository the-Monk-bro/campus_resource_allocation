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

    console.log("🌱 Starting minimal seed...");
    const defaultHashedPassword = await bcrypt.hash("password123", 10);

    // ── 1. Users ───────────────────────────────────────────────────────────────
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

    for (const u of sampleUsers) {
      await connection.execute(
        `INSERT INTO users (id, name, email, password, department, role, phno) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, u.password, u.department, u.role, u.phno]
      );
    }
    console.log(`✅ Seeded ${sampleUsers.length} users (default password: "password123").`);

    // ── 2. Resources ──────────────────────────────────────────────────────────
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

    // ── 3. Approval Hierarchies ────────────────────────────────────────────────
    console.log("🏛️ Seeding approval hierarchies...");
    const sampleHierarchies = [
      { hid: "H-AUDI-L1",   hlevel: 1, approverid: "usr-admin-01",   resid: "AUDI-MAIN" },
      { hid: "H-AUDI-L2",   hlevel: 2, approverid: "usr-gensec-01",  resid: "AUDI-MAIN" },
      { hid: "H-AUDI-L3",   hlevel: 3, approverid: "usr-pres-01",    resid: "AUDI-MAIN" },
      { hid: "H-LH201-L1",  hlevel: 1, approverid: "usr-faculty-01", resid: "LH-201" },
      { hid: "H-LH101-L1",  hlevel: 1, approverid: "usr-faculty-01", resid: "LH-101" },
      { hid: "H-LH102-L1",  hlevel: 1, approverid: "usr-staff-01",   resid: "LH-102" },
      { hid: "H-LABCSE-L1", hlevel: 1, approverid: "usr-admin-01",   resid: "LAB-CSE-1" },
      { hid: "H-AI-L1",     hlevel: 1, approverid: "usr-admin-01",   resid: "LAB-AI-GPU" },
      { hid: "H-SPORT-L1",  hlevel: 1, approverid: "usr-gensec-01",  resid: "SPORTS-ARENA" },
      { hid: "H-SPORT-L2",  hlevel: 2, approverid: "usr-pres-01",    resid: "SPORTS-ARENA" },
      { hid: "H-SEMA-L1",   hlevel: 1, approverid: "usr-faculty-01", resid: "SEMINAR-A" },
      { hid: "H-CR301-L1",  hlevel: 1, approverid: "usr-faculty-01", resid: "CR-301" },
    ];

    for (const h of sampleHierarchies) {
      await connection.execute(
        `INSERT INTO approval_hierarchies (hid, hlevel, approverid, resid) VALUES (?, ?, ?, ?)`,
        [h.hid, h.hlevel, h.approverid, h.resid]
      );
    }
    console.log(`✅ Seeded ${sampleHierarchies.length} approval hierarchy records.`);

    console.log("\n🎉 Database reset and minimal seeding completed!");
    console.log("-------------------------------------------------------");
    console.log("Seeded tables:");
    console.log("  • users");
    console.log("  • resources");
    console.log("  • approval_hierarchies");
    console.log("");
    console.log("NOT seeded:");
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
