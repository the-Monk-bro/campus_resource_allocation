import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  smallint,
  varchar,
  serial,
  pgEnum,
  check,
  unique,
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
  password: text("password"),
  department: text("department"),
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

export const reqstatusEnum = pgEnum("request_status", ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

export const requests = pgTable(
  "requests",
  {
    reqid: serial("reqid").primaryKey(),
    requesterid: text("requesterid").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    resid: varchar("resid", { length: 100 }).notNull().references(() => resources.id, { onDelete: "restrict", onUpdate: "cascade" }),
    purpose: varchar("purpose", { length: 100 }),
    reqtime: timestamp("reqtime").defaultNow().notNull(),
    starttime: timestamp("starttime").notNull(),
    endtime: timestamp("endtime").notNull(),
    reqstatus: reqstatusEnum("reqstatus").default("PENDING").notNull(),
  },
  (requests) => [
    check("req_time_check", sql`${requests.endtime} > ${requests.starttime}`),
  ]
)


export const approvalStatusEnum = pgEnum("approval_status", ["PENDING", "APPROVED", "REJECTED"]);

export const approval_hierarchies = pgTable(
  "approval_hierarchies",
  {
    hid: varchar("hid", { length: 20 }).primaryKey(),
    hlevel: smallint("hlevel").notNull().default(1),
    approverid: text("approverid").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    resid: varchar("resid", { length: 100 }).notNull().references(() => resources.id, { onDelete: "restrict", onUpdate: "cascade" }),
  },
  (t) => [
    unique("unique_res_level").on(t.resid, t.hlevel),
    check("hlevel_check", sql`${t.hlevel} > 0`),
  ]
)

export const approval_steps = pgTable(
  "approval_steps",
  {
    hid: varchar("hid", { length: 20 }).notNull().references(() => approval_hierarchies.hid, { onDelete: "restrict", onUpdate: "cascade" }),
    reqid: integer("reqid").notNull().references(() => requests.reqid, { onDelete: "restrict", onUpdate: "cascade" }),
    approverid: text("approverid").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    issuetime: timestamp("issuetime").defaultNow().notNull(),
    actiontime: timestamp("actiontime"),
    shortcomment: varchar("shortcomment", { length: 100 }),
    approvalstatus: approvalStatusEnum("approvalstatus").default("PENDING").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.hid, t.reqid] }),
    check("actiontime_check", sql`${t.actiontime} IS NULL OR ${t.actiontime} >= ${t.issuetime}`),
    check("approvalstatus_actiontime_check", sql`${t.approvalstatus} = 'PENDING' OR ${t.actiontime} IS NOT NULL`),
  ]
)


export const allocstatusEnum = pgEnum("allocation_status", ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"]);

export const allocations = pgTable(
  "allocations",
  {
    allocationid: serial("allocationid").primaryKey(),
    reqid: integer("reqid").notNull().unique().references(() => requests.reqid, { onDelete: "restrict", onUpdate: "cascade" }),
    allocationstatus: allocstatusEnum("allocationstatus").default("SCHEDULED").notNull(),
  }
)
