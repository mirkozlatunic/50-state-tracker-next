// "Download backup": a copy of the whole database as one SQLite file, with the
// same tables as the Flask app, so it can be loaded straight into Turso
// (turso db create ... --from-file) or opened with any SQLite tool.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type InValue } from "@libsql/client";
import type { Database } from "@/db";

// The tables to copy, parents first (a visit needs its state to exist).
// login_failures is left out: it only matters for a minute.
const TABLES = ["states", "visits", "trips", "trip_states", "trip_cities"] as const;

/** The download's name, e.g. "tracker-2026-10-22.sqlite". */
export function backupFileName(today: string): string {
  return `tracker-${today}.sqlite`;
}

/** Write a copy of the database into a new SQLite file at `file`. */
export async function writeBackup(db: Database, file: string): Promise<void> {
  const copy = createClient({ url: `file:${file}` });
  try {
    // The same tables as the app (and the Flask app), created from schema.sql.
    await copy.executeMultiple(readFileSync(join(process.cwd(), "src/db/schema.sql"), "utf8"));
    for (const table of TABLES) {
      const { columns, rows } = await db.$client.execute(`SELECT * FROM ${table}`);
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
