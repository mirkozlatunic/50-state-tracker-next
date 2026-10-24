// Opening the database and setting it up. Online it's Turso (hosted SQLite);
// in development and tests it's a plain local SQLite file. @libsql/client
// talks to both, and Drizzle builds the queries on top of it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { STATES } from "@/lib/data/states";
import * as schema from "./schema";

/** Where the database is: a Turso address plus its token, or "file:some.sqlite". */
export type DatabaseConfig = { url: string; authToken?: string };

/** Open a connection. Drizzle's `db.$client` is the raw libsql client underneath. */
export function openDatabase(config: DatabaseConfig) {
  return drizzle({ connection: config, schema });
}

export type Database = ReturnType<typeof openDatabase>;

/** Add a text column to a table from an older version of the app, if it's
 * missing; its existing rows get "". (PRAGMA table_info lists a table's columns.)
 * user_id came with accounts (slice 13): old rows belong to nobody until given
 * to someone. story came with visit pages (slice 17). share_id came with shared
 * maps (slice 20) and may be empty (NULL), so it gets its own `type`. */
async function addTextColumn(db: Database, table: "visits" | "trips" | "user_settings", column: string, type = "TEXT NOT NULL DEFAULT ''") {
  const columns = (await db.$client.execute(`PRAGMA table_info(${table})`)).rows.map((row) => row.name);
  if (!columns.includes(column)) {
    await db.$client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

/** Create the tables (from schema.sql) and add the 50 states.
 * Safe to run more than once: existing tables and data are kept, and
 * INSERT OR IGNORE skips states that are already there. */
export async function setupDatabase(db: Database) {
  const schemaSql = readFileSync(join(process.cwd(), "src/db/schema.sql"), "utf8");
  await db.$client.executeMultiple(schemaSql);
  await addTextColumn(db, "visits", "user_id");
  await addTextColumn(db, "trips", "user_id");
  await addTextColumn(db, "visits", "story");
  await addTextColumn(db, "user_settings", "share_id", "TEXT");
  // An "index" lets the database find one person's rows without reading every row.
  await db.$client.executeMultiple(`
    CREATE INDEX IF NOT EXISTS visits_user ON visits (user_id);
    CREATE INDEX IF NOT EXISTS trips_user ON trips (user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS user_settings_share ON user_settings (share_id);`);
  await db.$client.batch(
    STATES.map(([code, name]) => ({ sql: "INSERT OR IGNORE INTO states (code, name) VALUES (?, ?)", args: [code, name] })),
    "write",
  );
}

// The app's one shared connection, set up the first time it's used.
let appDatabase: Promise<Database> | null = null;

/** The app's database, ready to use. Pass where it is (see src/lib/settings.ts). */
export function getDatabase(config: DatabaseConfig): Promise<Database> {
  appDatabase ??= (async () => {
    const db = openDatabase(config);
    await setupDatabase(db);
    return db;
  })().catch((error) => {
    appDatabase = null; // try again on the next request instead of failing forever
    throw error;
  });
  return appDatabase;
}
