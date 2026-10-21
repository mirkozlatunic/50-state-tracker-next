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

  test("the tables have the same columns as the Flask app, so its backup imports as is", async () => {
    expect(await columns("states")).toEqual(["id", "code", "name"]);
    expect(await columns("visits")).toEqual(["id", "state_id", "visit_date", "note", "city"]);
    expect(await columns("trips")).toEqual(["id", "name", "start_date", "end_date"]);
    expect(await columns("trip_states")).toEqual(["trip_id", "state_id"]);
    expect(await columns("trip_cities")).toEqual(["trip_id", "state_id", "city"]);
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
