// Slice 8: "Download backup" — a copy of the database as one SQLite file,
// with the same tables as the Flask app, ready to load into Turso.
// Slice 13: each person's backup holds only their own visits and trips.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { addPhoto, addTrip, addVisit } from "@/db/queries";
import { backupFileName, writeBackup } from "@/lib/backup";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

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
    await writeBackup(db(), ME, file);
    expect(readFileSync(file).subarray(0, 16).toString("latin1")).toBe("SQLite format 3\u0000");
  });

  test("holds the 50 states, every visit, and every trip with its states and cities", async () => {
    await addVisit(db(), ME, { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
    await addTrip(db(), ME, { name: "Four Corners", startDate: "2027-03-01", endDate: "2027-03-03", states: ["UT", "AZ"], cities: [{ name: "Moab", state: "UT" }] });
    await writeBackup(db(), ME, file);
    expect(await readBackup("SELECT COUNT(*) AS n FROM states")).toEqual([{ n: 50 }]);
    expect(await readBackup("SELECT visit_date, note, city FROM visits")).toEqual([{ visit_date: "2024-07-04", note: "Red Rocks", city: "Denver" }]);
    expect(await readBackup("SELECT name, start_date, end_date FROM trips")).toEqual([{ name: "Four Corners", start_date: "2027-03-01", end_date: "2027-03-03" }]);
    expect(await readBackup("SELECT COUNT(*) AS n FROM trip_states")).toEqual([{ n: 2 }]);
    expect(await readBackup("SELECT city FROM trip_cities")).toEqual([{ city: "Moab" }]);
  });

  test("keeps the ids, so trips stay linked to their states and cities", async () => {
    const id = await addTrip(db(), ME, { name: "Weekend", startDate: "2027-03-01", endDate: "2027-03-02", states: ["VT"], cities: [] });
    await writeBackup(db(), ME, file);
    expect(await readBackup("SELECT trip_id FROM trip_states")).toEqual([{ trip_id: id }]);
  });

  test("lists my photos (where they are, not the pictures themselves), nobody else's", async () => {
    const mine = await addVisit(db(), ME, { state: "CO", visitDate: "2024-07-04", note: "", city: null });
    const theirs = await addVisit(db(), OTHER, { state: "UT", visitDate: "2024-07-05", note: "", city: null });
    await addPhoto(db(), ME, mine, { fullPath: "photos/me/full.jpg", thumbPath: "photos/me/thumb.jpg", width: 10, height: 10 });
    await addPhoto(db(), OTHER, theirs, { fullPath: "photos/other/full.jpg", thumbPath: "photos/other/thumb.jpg", width: 10, height: 10 });
    await writeBackup(db(), ME, file);
    expect(await readBackup("SELECT full_path FROM visit_photos")).toEqual([{ full_path: "photos/me/full.jpg" }]);
  });

  test("has the Flask app's tables and columns, plus whose each visit and trip is", async () => {
    await writeBackup(db(), ME, file);
    const columns = async (table: string) => (await readBackup(`PRAGMA table_info(${table})`)).map((row) => row.name);
    expect(await columns("states")).toEqual(["id", "code", "name"]);
    expect(await columns("visits")).toEqual(["id", "state_id", "visit_date", "note", "city", "user_id", "story"]);
    expect(await columns("trips")).toEqual(["id", "name", "start_date", "end_date", "user_id"]);
    expect(await columns("trip_states")).toEqual(["trip_id", "state_id"]);
    expect(await columns("trip_cities")).toEqual(["trip_id", "state_id", "city"]);
  });

  test("holds only this person's visits and trips, not anyone else's", async () => {
    await addVisit(db(), ME, { state: "CO", visitDate: "2024-07-04", note: "mine", city: null });
    await addVisit(db(), OTHER, { state: "UT", visitDate: "2024-07-05", note: "theirs", city: null });
    await addTrip(db(), OTHER, { name: "Their trip", startDate: "2027-03-01", endDate: "2027-03-02", states: ["VT"], cities: [{ name: "Burlington", state: "VT" }] });
    await writeBackup(db(), ME, file);
    expect(await readBackup("SELECT note FROM visits")).toEqual([{ note: "mine" }]);
    expect(await readBackup("SELECT COUNT(*) AS n FROM trips")).toEqual([{ n: 0 }]);
    expect(await readBackup("SELECT COUNT(*) AS n FROM trip_states")).toEqual([{ n: 0 }]);
    expect(await readBackup("SELECT COUNT(*) AS n FROM trip_cities")).toEqual([{ n: 0 }]);
  });
});
