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

    // Apply integrity rules: overlap trigger, stored functions, allocation status procedure and event
    const integrityPath = path.join(process.cwd(), "sql", "integrity.sql");
    if (fs.existsSync(integrityPath)) {
      console.log("🔒 Applying integrity rules from sql/integrity.sql...");
      const integritySql = fs.readFileSync(integrityPath, "utf-8");
      for (const stmt of splitSqlStatements(integritySql)) {
        await connection.query(stmt);
      }
      console.log("✅ Integrity trigger, functions, procedure and event applied successfully!");

      try {
        await connection.query("SET GLOBAL event_scheduler = ON");
      } catch {
        console.warn("⚠️ Could not turn on the event scheduler. Run this yourself: SET GLOBAL event_scheduler = ON;");
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

    const viewsPath = path.join(process.cwd(), "sql", "views.sql");
    if (fs.existsSync(viewsPath)) {
      console.log("👁️  Applying analytical and operational views from sql/views.sql...");
      const viewsSql = fs.readFileSync(viewsPath, "utf-8");
      for (const stmt of splitSqlStatements(viewsSql)) {
        await connection.query(stmt);
      }
      console.log("✅ Analytical views applied successfully!");
    }

    // ── Seed ONLY the Primary CRAS Administrator ───────────────────────────
    console.log("👑 Seeding root CRAS administrator...");
    const adminHashedPassword = await bcrypt.hash("password123", 10);

    // 1. Admin User
    await connection.execute(
      `INSERT INTO users (id, name, email, password, phno) VALUES (?, ?, ?, ?, ?)`,
      [
        "usr-cras-admin",
        "CRAS Administrator",
        "admin.cras@campus.edu",
        adminHashedPassword,
        "9999888877",
      ]
    );

    // 2. Admin Role
    await connection.execute(
      `INSERT INTO roles (RoleId, RoleName) VALUES (?, ?)`,
      ["ROLE-ADMIN", "Admin"]
    );

    // 3. CRAS Institute Scope
    await connection.execute(
      `INSERT INTO scopes (ScopeId, ScopeName, ScopeType) VALUES (?, ?, ?)`,
      ["SCOPE-CRAS", "CRAS", "INSTITUTE"]
    );

    // 4. Admin Role Assignment (Active indefinitely)
    await connection.execute(
      `INSERT INTO role_assignments (AssignmentId, UserId, RoleId, ScopeId, ValidFrom, ValidUntil)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1, "usr-cras-admin", "ROLE-ADMIN", "SCOPE-CRAS", "2025-01-01 00:00:00", null]
    );
    console.log("✅ Seeded CRAS Administrator (admin.cras@campus.edu).");

    console.log("\n🎉 Database minimal reset completed!");
    console.log("-------------------------------------------------------");
    console.log("Initialized Objects & Data:");
    console.log("  • All schema tables, triggers, procedures, functions, and views");
    console.log("  • Seeded ONLY 1 root administrator:");
    console.log("      Email:    admin.cras@campus.edu");
    console.log("      Password: password123");
    console.log("      Role:     Admin (Scope: CRAS)");
    console.log("");
    console.log("  • NO other users, facilities, roles, or mock bookings seeded.");
    console.log("-------------------------------------------------------");
  } catch (error) {
    console.error("❌ Error during database reset:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
