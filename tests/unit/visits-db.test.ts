// Slice 4: reading and writing states, visits and trips in the database.
// Each test gets its own temporary database.
import { describe, expect, test } from "vitest";
import {
  addVisit,
  deleteVisit,
  getState,
  getVisit,
  listStates,
  loadTrips,
  updateVisit,
  visitsForState,
} from "@/db/queries";
import { addTripForTest } from "./trip-helpers";
import { withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

describe("the states list", () => {
  test("has all 50 states A to Z, none visited at first", async () => {
    const states = await listStates(db());
    expect(states).toHaveLength(50);
    expect(states[0]).toEqual({ code: "AL", name: "Alabama", visited: false });
    const names = states.map((state) => state.name);
    expect(names).toEqual([...names].sort());
  });

  test("marks a state visited once it has a visit", async () => {
    await addVisit(db(), { state: "CA", visitDate: "2024-07-04", note: "", city: null });
    const states = await listStates(db());
    expect(states.find((s) => s.code === "CA")?.visited).toBe(true);
    expect(states.filter((s) => s.visited)).toHaveLength(1);
  });
});

describe("one state", () => {
  test("is found by its code, in any case", async () => {
    expect(await getState(db(), "CA")).toMatchObject({ code: "CA", name: "California" });
    expect(await getState(db(), "ca")).toMatchObject({ code: "CA" });
  });

  test("D.C. or a made-up code gives null", async () => {
    expect(await getState(db(), "DC")).toBeNull();
    expect(await getState(db(), "XX")).toBeNull();
  });
});

describe("visits", () => {
  test("a saved visit comes back the way it was saved", async () => {
    const id = await addVisit(db(), { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
    expect(await getVisit(db(), id)).toEqual({ id, state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
  });

  test("an unknown visit gives null", async () => {
    expect(await getVisit(db(), 999)).toBeNull();
  });

  test("a state's visits are newest first; on the same day, the one added later first", async () => {
    await addVisit(db(), { state: "CA", visitDate: "2020-01-01", note: "first", city: null });
    await addVisit(db(), { state: "CA", visitDate: "2024-07-04", note: "second", city: null });
    await addVisit(db(), { state: "CA", visitDate: "2024-07-04", note: "third", city: null });
    await addVisit(db(), { state: "NV", visitDate: "2025-01-01", note: "Nevada", city: null });
    const notes = (await visitsForState(db(), "CA")).map((visit) => visit.note);
    expect(notes).toEqual(["third", "second", "first"]);
  });

  test("editing changes state, date, note and city", async () => {
    const id = await addVisit(db(), { state: "CA", visitDate: "2024-07-04", note: "old", city: "Fresno" });
    await updateVisit(db(), id, { state: "NV", visitDate: "2024-08-01", note: "new", city: null });
    expect(await getVisit(db(), id)).toEqual({ id, state: "NV", visitDate: "2024-08-01", note: "new", city: null });
  });

  test("deleting removes only that visit and gives back its state", async () => {
    const keep = await addVisit(db(), { state: "CA", visitDate: "2024-07-04", note: "keep", city: null });
    const gone = await addVisit(db(), { state: "CA", visitDate: "2024-07-05", note: "gone", city: null });
    expect(await deleteVisit(db(), gone)).toBe("CA");
    expect(await getVisit(db(), gone)).toBeNull();
    expect(await getVisit(db(), keep)).not.toBeNull();
  });

  test("deleting an unknown visit gives null", async () => {
    expect(await deleteVisit(db(), 999)).toBeNull();
  });
});

describe("loading trips", () => {
  test("each trip comes with its states and cities", async () => {
    await addTripForTest(db(), {
      name: "Four Corners",
      startDate: "2027-03-01",
      endDate: "2027-03-03",
      states: ["UT", "AZ"],
      cities: [{ name: "Moab", state: "UT" }],
    });
    const [trip] = await loadTrips(db());
    expect(trip).toMatchObject({ name: "Four Corners", startDate: "2027-03-01", endDate: "2027-03-03" });
    expect([...trip.states].sort()).toEqual(["AZ", "UT"]);
    expect(trip.cities).toEqual([{ name: "Moab", state: "UT" }]);
  });
});
