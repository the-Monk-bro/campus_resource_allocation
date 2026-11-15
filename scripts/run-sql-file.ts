/**
 * scripts/run-sql-file.ts
 *
 * WHY: `DELIMITER //` is a feature of the mysql CLI client, NOT of the server,
 * so mysql2 cannot execute procedures.sql as-is. This helper emulates the
 * client: it tracks DELIMITER changes, splits the file into statements and
 * runs them one by one. Use it from scripts/reset-db.ts after schema.sql:
 *
 *   import { runSqlFile } from "./run-sql-file";
 *   await runSqlFile(connection, "procedures.sql");   // mysql2/promise Connection or PoolConnection
 *   await runSqlFile(connection, "triggers.sql");
 */
import fs from "fs";
import path from "path";

type Queryable = { query: (sql: string) => Promise<unknown> };

export async function runSqlFile(conn: Queryable, file: string): Promise<void> {
  const raw = fs.readFileSync(path.resolve(file), "utf8");
  let delimiter = ";";
  let buffer = "";
  const statements: string[] = [];

  const hasCode = (s: string) =>
    s.split(/\r?\n/).some((l) => l.trim() !== "" && !l.trim().startsWith("--"));

  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (m) {
      delimiter = m[1];
      continue;
    }
    buffer += line + "\n";
    const trimmed = buffer.trimEnd();
    if (trimmed.endsWith(delimiter)) {
      const stmt = trimmed.slice(0, -delimiter.length).trim();
      if (hasCode(stmt)) statements.push(stmt);
      buffer = "";
    }
  }
  if (hasCode(buffer)) statements.push(buffer.trim());

  for (const s of statements) {
    await conn.query(s);
  }
}
