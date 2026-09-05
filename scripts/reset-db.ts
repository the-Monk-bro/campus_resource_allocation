import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";
import { execSync } from "child_process";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in environment!");
    process.exit(1);
  }

  console.log("🧹 Clearing database tables and records...");
  const sql = postgres(dbUrl, { max: 1 });

  try {
    // Drop and recreate public schema to wipe all existing tables and data
    await sql`DROP SCHEMA public CASCADE;`;
    await sql`CREATE SCHEMA public;`;
    await sql`GRANT ALL ON SCHEMA public TO public;`;
    console.log("✅ Database cleared successfully!");
  } catch (error) {
    console.error("⚠️ Error clearing schema:", error);
  } finally {
    await sql.end();
  }

  console.log("🚀 Pushing latest schema with drizzle-kit...");
  try {
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    console.log("🎉 Database reset and schema push completed successfully!");
  } catch (error) {
    console.error("❌ Failed to push schema:", error);
    process.exit(1);
  }
}

main();
