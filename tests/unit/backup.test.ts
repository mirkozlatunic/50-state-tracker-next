// Slice 8: "Download backup" — a copy of the whole database as one SQLite
// file, with the same tables as the Flask app, ready to load into Turso.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { addTrip, addVisit } from "@/db/queries";
import { recordFailure } from "@/lib/auth/lockout";
import { backupFileName, writeBackup } from "@/lib/backup";
import { withTestDatabase } from "./db-helpers";

const db = withTestDatabase();
let folder: string;
let file: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "tracker-backup-"));
  file = join(folder, "backup.sqlite");
});

afterEach(() => rmSync(folder, { recursive: true, force: true }));

/** Read rows from the backup file with a plain SQLite connection. */
async function readBackup(sql: string) {
  const copy = createClient({ url: `file:${file}` });
  const result = await copy.execute(sql);
  copy.close();
  return result.rows.map((row) => ({ ...row }));
}

describe("the backup file", () => {
  test("is named after today's date", () => {
    expect(backupFileName("2026-10-22")).toBe("tracker-2026-10-22.sqlite");
  });

  test("is a real SQLite file", async () => {
    await writeBackup(db(), file);
    expect(readFileSync(file).subarray(0, 16).toString("latin1")).toBe("SQLite format 3\u0000");
  });

  test("holds the 50 states, every visit, and every trip with its states and cities", async () => {
    await addVisit(db(), { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
    await addTrip(db(), { name: "Four Corners", startDate: "2027-03-01", endDate: "2027-03-03", states: ["UT", "AZ"], cities: [{ name: "Moab", state: "UT" }] });
    await writeBackup(db(), file);
    expect(await readBackup("SELECT COUNT(*) AS n FROM states")).toEqual([{ n: 50 }]);
    expect(await readBackup("SELECT visit_date, note, city FROM visits")).toEqual([{ visit_date: "2024-07-04", note: "Red Rocks", city: "Denver" }]);
    expect(await readBackup("SELECT name, start_date, end_date FROM trips")).toEqual([{ name: "Four Corners", start_date: "2027-03-01", end_date: "2027-03-03" }]);
    expect(await readBackup("SELECT COUNT(*) AS n FROM trip_states")).toEqual([{ n: 2 }]);
    expect(await readBackup("SELECT city FROM trip_cities")).toEqual([{ city: "Moab" }]);
  });

  test("keeps the ids, so trips stay linked to their states and cities", async () => {
    const id = await addTrip(db(), { name: "Weekend", startDate: "2027-03-01", endDate: "2027-03-02", states: ["VT"], cities: [] });
    await writeBackup(db(), file);
    expect(await readBackup("SELECT trip_id FROM trip_states")).toEqual([{ trip_id: id }]);
  });

  test("has the same tables and columns as the Flask app", async () => {
    await writeBackup(db(), file);
    const columns = async (table: string) => (await readBackup(`PRAGMA table_info(${table})`)).map((row) => row.name);
    expect(await columns("states")).toEqual(["id", "code", "name"]);
    expect(await columns("visits")).toEqual(["id", "state_id", "visit_date", "note", "city"]);
    expect(await columns("trips")).toEqual(["id", "name", "start_date", "end_date"]);
    expect(await columns("trip_states")).toEqual(["trip_id", "state_id"]);
    expect(await columns("trip_cities")).toEqual(["trip_id", "state_id", "city"]);
  });

  test("leaves out the wrong-password log, which only matters for a minute", async () => {
    await recordFailure(db(), Date.now());
    await writeBackup(db(), file);
    expect(await readBackup("SELECT COUNT(*) AS n FROM login_failures")).toEqual([{ n: 0 }]);
  });
});
