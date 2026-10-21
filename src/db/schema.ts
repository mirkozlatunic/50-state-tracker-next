// The tables, described in TypeScript for Drizzle (the library that builds
// the SQL queries). They match src/db/schema.sql, which creates them, and the
// Flask app's tables, so a backup from the Flask app imports as is.
// Column names in quotes are the real names in the database; the keys
// (like stateId) are the names used in the code.

import { sql } from "drizzle-orm";
import { check, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const states = sqliteTable("states", {
  id: integer("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "CA"
  name: text("name").notNull().unique(), // e.g. "California"
});

// One row per visit. A state can have several; progress counts each state once.
export const visits = sqliteTable("visits", {
  id: integer("id").primaryKey(),
  stateId: integer("state_id").notNull().references(() => states.id),
  visitDate: text("visit_date").notNull(), // "YYYY-MM-DD"
  note: text("note").notNull().default(""),
  city: text("city"), // optional; official spelling from the city list
});

export const trips = sqliteTable(
  "trips",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    startDate: text("start_date").notNull(), // "YYYY-MM-DD"
    endDate: text("end_date").notNull(), // "YYYY-MM-DD"
  },
  // A backstop for the rule; the app checks it first with a friendly message.
  (table) => [check("end_not_before_start", sql`${table.endDate} >= ${table.startDate}`)],
);

// A "join table": one row per (trip, state), so one trip can have many states.
export const tripStates = sqliteTable(
  "trip_states",
  {
    tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    stateId: integer("state_id").notNull().references(() => states.id),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.stateId] })],
);

// The cities on a trip, stored as name plus state, one row per (trip, city).
export const tripCities = sqliteTable(
  "trip_cities",
  {
    tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    stateId: integer("state_id").notNull().references(() => states.id),
    city: text("city").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.stateId, table.city] })],
);

// Wrong passwords, for the "5 tries, then wait a minute" rule (milliseconds since 1970).
export const loginFailures = sqliteTable("login_failures", {
  id: integer("id").primaryKey(),
  failedAt: integer("failed_at").notNull(),
});
