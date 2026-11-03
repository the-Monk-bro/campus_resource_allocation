import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

export const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "campus_resource_allocation",
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT
      ? parseInt(process.env.DB_CONNECTION_LIMIT, 10)
      : 10,
    queueLimit: 0,
    decimalNumbers: true,
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

export default pool;

