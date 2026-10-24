// Slice 1: the database. Each test gets its own temporary SQLite file,
// never the real data.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { asc, eq } from "drizzle-orm";
import { openDatabase, setupDatabase, type Database } from "@/db";
import { states, tripCities, trips, tripStates, visits } from "@/db/schema";
import { EXPECTED_STATES } from "./expected";

let folder: string;
let db: Database;

beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), "tracker-test-"));
  db = openDatabase({ url: `file:${join(folder, "test.sqlite")}` });
  await setupDatabase(db);
});

afterEach(() => {
  db.$client.close();
  rmSync(folder, { recursive: true, force: true });
});

/** The column names of one table, in order, as SQLite reports them. */
async function columns(table: string) {
  const result = await db.$client.execute(`PRAGMA table_info(${table})`);
  return result.rows.map((row) => row.name);
}

describe("setting up the database", () => {
  test("adds exactly the 50 states with their official names", async () => {
    const rows = await db.select().from(states);
    expect(Object.fromEntries(rows.map((row) => [row.code, row.name]))).toEqual(EXPECTED_STATES);
  });

  test("running it twice still gives 50 states and keeps existing data", async () => {
    const [{ id: coloradoId }] = await db.select().from(states).where(eq(states.code, "CO"));
    await db.insert(visits).values({ stateId: coloradoId, visitDate: "2024-07-04", note: "Red Rocks" });
    await setupDatabase(db);
    expect(await db.$count(states)).toBe(50);
    expect(await db.$count(visits)).toBe(1);
  });

  test("the tables have the Flask app's columns, plus whose each visit and trip is (and a visit's story)", async () => {
    expect(await columns("states")).toEqual(["id", "code", "name"]);
    expect(await columns("visits")).toEqual(["id", "state_id", "visit_date", "note", "city", "user_id", "story"]);
    expect(await columns("trips")).toEqual(["id", "name", "start_date", "end_date", "user_id"]);
    expect(await columns("trip_states")).toEqual(["trip_id", "state_id"]);
    expect(await columns("trip_cities")).toEqual(["trip_id", "state_id", "city"]);
  });

  test("each person's settings have their own table (slice 19)", async () => {
    expect(await columns("user_settings")).toEqual(["user_id", "celebrated", "share_id"]); // share_id: slice 20
  });

  test("a visit's photos have their own table (slice 18)", async () => {
    expect(await columns("visit_photos")).toEqual(["id", "visit_id", "user_id", "full_path", "thumb_path", "width", "height", "created_at"]);
  });
});

describe("an older database without people (slice 13)", () => {
  // The tables as they were before accounts: no user_id column, one visit and one trip in them.
  const OLD_TABLES = `
    CREATE TABLE states (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT UNIQUE NOT NULL);
    CREATE TABLE visits (id INTEGER PRIMARY KEY, state_id INTEGER NOT NULL REFERENCES states(id),
      visit_date TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', city TEXT);
    CREATE TABLE trips (id INTEGER PRIMARY KEY, name TEXT NOT NULL, start_date TEXT NOT NULL,
      end_date TEXT NOT NULL, CHECK (end_date >= start_date));
    INSERT INTO states (id, code, name) VALUES (6, 'CO', 'Colorado');
    INSERT INTO visits (state_id, visit_date, note) VALUES (6, '2024-07-04', 'Red Rocks');
    INSERT INTO trips (name, start_date, end_date) VALUES ('Ski', '2027-01-10', '2027-01-12');`;

  /** A fresh database file holding the old tables. */
  async function oldDatabase() {
    const old = openDatabase({ url: `file:${join(folder, "old.sqlite")}` });
    await old.$client.executeMultiple(OLD_TABLES);
    return old;
  }

  test("setting it up adds the user_id column and keeps every row", async () => {
    const old = await oldDatabase();
    await setupDatabase(old);
    const oldColumns = async (table: string) =>
      (await old.$client.execute(`PRAGMA table_info(${table})`)).rows.map((row) => row.name);
    expect(await oldColumns("visits")).toContain("user_id");
    expect(await oldColumns("visits")).toContain("story"); // slice 17
    expect(await oldColumns("trips")).toContain("user_id");
    // The old rows belong to nobody yet (""), until they're given to someone.
    expect((await old.$client.execute("SELECT note, user_id, story FROM visits")).rows.map((row) => ({ ...row }))).toEqual([
      { note: "Red Rocks", user_id: "", story: "" },
    ]);
    expect((await old.$client.execute("SELECT name, user_id FROM trips")).rows.map((row) => ({ ...row }))).toEqual([
      { name: "Ski", user_id: "" },
    ]);
    old.$client.close();
  });

  test("setting it up twice is fine", async () => {
    const old = await oldDatabase();
    await setupDatabase(old);
    await setupDatabase(old);
    expect(await old.$count(visits)).toBe(1);
    old.$client.close();
  });

  test("there's no wrong-password table any more (Clerk handles logging in)", async () => {
    const tables = (await db.$client.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((row) => row.name);
    expect(tables).not.toContain("login_failures");
  });
});

describe("the tables", () => {
  /** The id of one state, by its code. */
  async function stateId(code: string) {
    const [row] = await db.select({ id: states.id }).from(states).where(eq(states.code, code));
    return row.id;
  }

  test("a trip ending before it starts is refused by the database too", async () => {
    await expect(
      db.insert(trips).values({ name: "Backwards", startDate: "2027-03-03", endDate: "2027-03-01" }),
    ).rejects.toThrow();
  });

  test("the same state can't be added to a trip twice", async () => {
    const [{ id }] = await db
      .insert(trips)
      .values({ name: "Weekend", startDate: "2027-03-01", endDate: "2027-03-03" })
      .returning();
    const az = await stateId("AZ");
    await db.insert(tripStates).values({ tripId: id, stateId: az });
    await expect(db.insert(tripStates).values({ tripId: id, stateId: az })).rejects.toThrow();
  });

  test("deleting a trip removes its states and cities, but keeps visits", async () => {
    const co = await stateId("CO");
    await db.insert(visits).values({ stateId: co, visitDate: "2024-07-04", city: "Denver" });
    const [{ id }] = await db
      .insert(trips)
      .values({ name: "Ski", startDate: "2027-01-10", endDate: "2027-01-12" })
      .returning();
    await db.insert(tripStates).values({ tripId: id, stateId: co });
    await db.insert(tripCities).values({ tripId: id, stateId: co, city: "Aspen" });

    await db.delete(trips).where(eq(trips.id, id));

    expect(await db.$count(tripStates)).toBe(0);
    expect(await db.$count(tripCities)).toBe(0);
    expect(await db.$count(visits)).toBe(1);
  });

  test("a visit can't point at a state that doesn't exist", async () => {
    await expect(db.insert(visits).values({ stateId: 999, visitDate: "2024-07-04" })).rejects.toThrow();
  });

  test("a visit's note defaults to empty and its city to none", async () => {
    await db.insert(visits).values({ stateId: await stateId("UT"), visitDate: "2024-07-04" });
    const [row] = await db.select().from(visits).orderBy(asc(visits.id));
    expect([row.note, row.city]).toEqual(["", null]);
  });
});
