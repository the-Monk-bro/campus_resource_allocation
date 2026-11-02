import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";
import { execSync } from "child_process";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import {
  users,
  resources,
  approval_hierarchies,
} from "../db/schema";

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in environment!");
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. RESET DATABASE
  // ────────────────────────────────────────────────────────────────────────────
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

  // Recreate the complete schema.
  // Only users, resources and approval_hierarchies will be seeded below.
  console.log("🚀 Pushing latest schema with drizzle-kit...");

  try {
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    console.log("🎉 Database schema push completed successfully!");
  } catch (error) {
    console.error("❌ Failed to push schema:", error);
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. SEED ONLY USERS, RESOURCES AND APPROVAL HIERARCHIES
  // ────────────────────────────────────────────────────────────────────────────
  console.log("🌱 Starting minimal seed...");

  const seedClient = postgres(dbUrl, { max: 5 });
  const db = drizzle(seedClient);

  try {
    // Default password for all seeded accounts
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

    await db.insert(users).values(sampleUsers);
    console.log(
      `✅ Seeded ${sampleUsers.length} users (default password: "password123").`
    );

    // ── 2. Resources ──────────────────────────────────────────────────────────
    console.log("🏫 Seeding campus resources...");

    const sampleResources = [
      {
        id: "LH-101",
        name: "Lecture Hall 101",
        type: "Lecture Hall",
        capacity: 150,
        location: "LH Complex Ground Floor",
        status: "AVAILABLE" as const,
      },
      {
        id: "LH-102",
        name: "Lecture Hall 102",
        type: "Lecture Hall",
        capacity: 150,
        location: "LH Complex Ground Floor",
        status: "AVAILABLE" as const,
      },
      {
        id: "LH-201",
        name: "Lecture Hall 201 (Amphitheater)",
        type: "Lecture Hall",
        capacity: 250,
        location: "LH Complex 1st Floor",
        status: "AVAILABLE" as const,
      },
      {
        id: "LAB-CSE-1",
        name: "Advanced Computing Lab",
        type: "Computer Lab",
        capacity: 60,
        location: "POD-1D 2nd Floor",
        status: "AVAILABLE" as const,
      },
      {
        id: "LAB-AI-GPU",
        name: "AI & GPU Research Center",
        type: "Computer Lab",
        capacity: 40,
        location: "Titanium Building Rm 204",
        status: "AVAILABLE" as const,
      },
      {
        id: "AUDI-MAIN",
        name: "APJ Abdul Kalam Auditorium",
        type: "Auditorium",
        capacity: 800,
        location: "Central Campus Plaza",
        status: "AVAILABLE" as const,
      },
      {
        id: "AUDI-MINI",
        name: "Mini Auditorium B",
        type: "Auditorium",
        capacity: 200,
        location: "Student Activity Center",
        status: "AVAILABLE" as const,
      },
      {
        id: "SEMINAR-A",
        name: "Department Seminar Hall A",
        type: "Seminar Room",
        capacity: 80,
        location: "School of Innovation Wing B",
        status: "AVAILABLE" as const,
      },
      {
        id: "SEMINAR-B",
        name: "International Conference Hall",
        type: "Seminar Room",
        capacity: 120,
        location: "Admin Block 3rd Floor",
        status: "MAINTENANCE" as const,
      },
      {
        id: "CR-301",
        name: "Classroom 301",
        type: "Classroom",
        capacity: 50,
        location: "POD-1A 3rd Floor",
        status: "AVAILABLE" as const,
      },
      {
        id: "SPORTS-ARENA",
        name: "Indoor Sports Complex",
        type: "Sports Arena",
        capacity: 300,
        location: "Gymkhana Sports Zone",
        status: "AVAILABLE" as const,
      },
      {
        id: "WORKSHOP-04",
        name: "Mechanical Fabrication Workshop",
        type: "Workshop",
        capacity: 35,
        location: "Heavy Engineering Shed 4",
        status: "RETIRED" as const,
      },
    ];

    await db.insert(resources).values(sampleResources);
    console.log(`✅ Seeded ${sampleResources.length} campus resources.`);

    // ── 3. Approval Hierarchies ────────────────────────────────────────────────
    console.log("🏛️ Seeding approval hierarchies...");

    const sampleHierarchies = [
      // AUDITORIUM: 3-level hierarchy
      {
        hid: "H-AUDI-L1",
        hlevel: 1,
        approverid: "usr-admin-01",
        resid: "AUDI-MAIN",
      },
      {
        hid: "H-AUDI-L2",
        hlevel: 2,
        approverid: "usr-gensec-01",
        resid: "AUDI-MAIN",
      },
      {
        hid: "H-AUDI-L3",
        hlevel: 3,
        approverid: "usr-pres-01",
        resid: "AUDI-MAIN",
      },

      // LECTURE HALL 201: single-level hierarchy
      {
        hid: "H-LH201-L1",
        hlevel: 1,
        approverid: "usr-faculty-01",
        resid: "LH-201",
      },

      // Other resources with simple one-level approval
      {
        hid: "H-LH101-L1",
        hlevel: 1,
        approverid: "usr-faculty-01",
        resid: "LH-101",
      },
      {
        hid: "H-LH102-L1",
        hlevel: 1,
        approverid: "usr-staff-01",
        resid: "LH-102",
      },
      {
        hid: "H-LABCSE-L1",
        hlevel: 1,
        approverid: "usr-admin-01",
        resid: "LAB-CSE-1",
      },
      {
        hid: "H-AI-L1",
        hlevel: 1,
        approverid: "usr-admin-01",
        resid: "LAB-AI-GPU",
      },
      {
        hid: "H-SPORT-L1",
        hlevel: 1,
        approverid: "usr-gensec-01",
        resid: "SPORTS-ARENA",
      },
      {
        hid: "H-SPORT-L2",
        hlevel: 2,
        approverid: "usr-pres-01",
        resid: "SPORTS-ARENA",
      },
      {
        hid: "H-SEMA-L1",
        hlevel: 1,
        approverid: "usr-faculty-01",
        resid: "SEMINAR-A",
      },
      {
        hid: "H-CR301-L1",
        hlevel: 1,
        approverid: "usr-faculty-01",
        resid: "CR-301",
      },
    ];

    await db.insert(approval_hierarchies).values(sampleHierarchies);
    console.log(
      `✅ Seeded ${sampleHierarchies.length} approval hierarchy records.`
    );

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
    await seedClient.end();
  }
}

main();
