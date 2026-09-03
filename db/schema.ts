import { pgTable, serial, varchar, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }),
    age: integer("age"),
});

export const resources = pgTable("resources", {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }),
    type: varchar("type", { length: 100 }),
});
