// "Download backup": a copy of my visits and trips as one SQLite file, with the
// same tables as the Flask app (plus user_id), so it can be loaded straight
// into Turso (turso db create ... --from-file) or opened with any SQLite tool.
// It holds only the signed-in person's rows, never anyone else's.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type InValue } from "@libsql/client";
import type { Database } from "@/db";

// What to copy from each table, parents first (a visit needs its state to exist).
// "?" is filled in with the person's id. A trip's states and cities are
// theirs when the trip is.
const MY_TRIPS = "SELECT id FROM trips WHERE user_id = ?";
const TABLES = [
  { table: "states", where: "", mine: false },
  { table: "visits", where: "WHERE user_id = ?", mine: true },
  { table: "trips", where: "WHERE user_id = ?", mine: true },
  { table: "trip_states", where: `WHERE trip_id IN (${MY_TRIPS})`, mine: true },
  { table: "trip_cities", where: `WHERE trip_id IN (${MY_TRIPS})`, mine: true },
];

/** The download's name, e.g. "tracker-2026-10-22.sqlite". */
export function backupFileName(today: string): string {
  return `tracker-${today}.sqlite`;
}

/** Write a copy of the 50 states and `userId`'s visits and trips into a new SQLite file at `file`. */
export async function writeBackup(db: Database, userId: string, file: string): Promise<void> {
  const copy = createClient({ url: `file:${file}` });
  try {
    // The same tables as the app (and the Flask app), created from schema.sql.
    await copy.executeMultiple(readFileSync(join(process.cwd(), "src/db/schema.sql"), "utf8"));
    for (const { table, where, mine } of TABLES) {
      const { columns, rows } = await db.$client.execute({ sql: `SELECT * FROM ${table} ${where}`, args: mine ? [userId] : [] });
      if (rows.length === 0) continue;
      const placeholders = columns.map(() => "?").join(", ");
      // Every row with its id, so trips stay linked to their states and cities.
      await copy.batch(
        rows.map((row) => ({
          sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
          args: columns.map((column) => row[column] as InValue),
        })),
        "write",
      );
    }
  } finally {
    copy.close();
  }
}
