import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  varchar,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";


export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  department: varchar("department", { length: 50 }),
  role: varchar("role", { length: 50 }),
  phno: varchar("phno", { length: 10 }),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);




export const statusEnum = pgEnum("resource_status", ["AVAILABLE", "MAINTENANCE", "RETIRED"]);

export const resources = pgTable(
  "resources",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 100 }),
    capacity: integer("capacity"),
    location: varchar("location", { length: 50 }),
    status: statusEnum("status").default("AVAILABLE").notNull(),
  },
  (resources) => [
    check("capacity_check", sql`${resources.capacity} > 0`),
  ]
);
