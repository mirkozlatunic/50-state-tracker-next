// Slice 5: saving, changing and deleting trips in the database.
// Each test gets its own temporary database.
import { describe, expect, test } from "vitest";
import { addTrip, addVisit, deleteTrip, getTrip, loadTrips, updateTrip } from "@/db/queries";
import { tripCities, tripStates, visits } from "@/db/schema";
import { withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

const FOUR_CORNERS = {
  name: "Four Corners weekend",
  startDate: "2027-03-01",
  endDate: "2027-03-03",
  states: ["AZ", "UT"],
  cities: [{ name: "Moab", state: "UT" }],
};

describe("trips", () => {
  test("a saved trip comes back with its states and cities", async () => {
    const id = await addTrip(db(), FOUR_CORNERS);
    const trip = await getTrip(db(), id);
    expect(trip).toMatchObject({ id, name: "Four Corners weekend", startDate: "2027-03-01", endDate: "2027-03-03" });
    expect([...trip!.states].sort()).toEqual(["AZ", "UT"]);
    expect(trip!.cities).toEqual([{ name: "Moab", state: "UT" }]);
  });

  test("an unknown trip gives null", async () => {
    expect(await getTrip(db(), 999)).toBeNull();
  });

  test("the same state twice is saved once", async () => {
    await addTrip(db(), { ...FOUR_CORNERS, states: ["AZ", "AZ"] , cities: [] });
    expect(await db().$count(tripStates)).toBe(1);
  });

  test("editing replaces the name, dates, states and cities", async () => {
    const id = await addTrip(db(), FOUR_CORNERS);
    await updateTrip(db(), id, {
      name: "Colorado instead",
      startDate: "2027-04-01",
      endDate: "2027-04-02",
      states: ["CO"],
      cities: [{ name: "Denver", state: "CO" }],
    });
    expect(await getTrip(db(), id)).toEqual({
      id,
      name: "Colorado instead",
      startDate: "2027-04-01",
      endDate: "2027-04-02",
      states: ["CO"],
      cities: [{ name: "Denver", state: "CO" }],
    });
    expect(await db().$count(tripStates)).toBe(1);
    expect(await db().$count(tripCities)).toBe(1);
  });

  test("deleting removes the trip with its states and cities, and keeps visits", async () => {
    await addVisit(db(), { state: "UT", visitDate: "2024-07-04", note: "", city: "Moab" });
    const id = await addTrip(db(), FOUR_CORNERS);
    expect(await deleteTrip(db(), id)).toBe(true);
    expect(await loadTrips(db())).toEqual([]);
    expect(await db().$count(tripStates)).toBe(0);
    expect(await db().$count(tripCities)).toBe(0);
    expect(await db().$count(visits)).toBe(1);
  });

  test("deleting an unknown trip gives false", async () => {
    expect(await deleteTrip(db(), 999)).toBe(false);
  });
});
