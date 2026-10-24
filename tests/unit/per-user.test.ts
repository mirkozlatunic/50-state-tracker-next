// Slice 13: everyone signs in with their own account and sees only their own
// visits, trips and progress. Two made-up people, ME and OTHER, share one
// database here; OTHER must never see or change anything of ME's.
import { describe, expect, test } from "vitest";
import {
  addTrip,
  addVisit,
  deleteTrip,
  deleteVisit,
  getTrip,
  getVisit,
  listStates,
  setVisitStory,
  loadTrips,
  loadVisits,
  setTripDates,
  updateTrip,
  updateVisit,
  visitedStateCount,
  visitsForState,
} from "@/db/queries";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

const RED_ROCKS = { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" };
const SKI_TRIP = { name: "Ski", startDate: "2027-01-10", endDate: "2027-01-12", states: ["CO"], cities: [{ name: "Aspen", state: "CO" }] };

describe("progress is per person", () => {
  test("my visits count for me, not for anyone else", async () => {
    await addVisit(db(), ME, RED_ROCKS);
    expect(await visitedStateCount(db(), ME)).toBe(1);
    expect(await visitedStateCount(db(), OTHER)).toBe(0);
  });

  test("the states list marks only my visited states", async () => {
    await addVisit(db(), ME, RED_ROCKS);
    expect((await listStates(db(), ME)).filter((s) => s.visited).map((s) => s.code)).toEqual(["CO"]);
    expect((await listStates(db(), OTHER)).filter((s) => s.visited)).toEqual([]);
  });

  test("two people visiting the same state each count it", async () => {
    await addVisit(db(), ME, RED_ROCKS);
    await addVisit(db(), OTHER, { ...RED_ROCKS, note: "theirs" });
    expect(await visitedStateCount(db(), ME)).toBe(1);
    expect(await visitedStateCount(db(), OTHER)).toBe(1);
    expect((await visitsForState(db(), ME, "CO")).map((v) => v.note)).toEqual(["Red Rocks"]);
  });
});

describe("visits are private", () => {
  test("someone else's lists don't show my visits (states page, map, years)", async () => {
    await addVisit(db(), ME, RED_ROCKS);
    expect(await visitsForState(db(), OTHER, "CO")).toEqual([]);
    expect(await loadVisits(db(), OTHER)).toEqual([]);
    expect(await loadVisits(db(), ME)).toHaveLength(1);
  });

  test("someone else can't open my visit: it's as if it didn't exist", async () => {
    const id = await addVisit(db(), ME, RED_ROCKS);
    expect(await getVisit(db(), OTHER, id)).toBeNull();
    expect(await getVisit(db(), ME, id)).toMatchObject({ id, note: "Red Rocks" });
  });

  test("someone else can't change my visit", async () => {
    const id = await addVisit(db(), ME, RED_ROCKS);
    expect(await updateVisit(db(), OTHER, id, { ...RED_ROCKS, note: "changed" })).toBe(false);
    expect((await getVisit(db(), ME, id))?.note).toBe("Red Rocks");
    expect(await updateVisit(db(), ME, id, { ...RED_ROCKS, note: "changed" })).toBe(true);
    expect((await getVisit(db(), ME, id))?.note).toBe("changed");
  });

  test("someone else can't write my visit's story", async () => {
    const id = await addVisit(db(), ME, RED_ROCKS);
    await setVisitStory(db(), ME, id, "mine");
    expect(await setVisitStory(db(), OTHER, id, "theirs")).toBe(false);
    expect((await getVisit(db(), ME, id))?.story).toBe("mine");
  });

  test("someone else can't delete my visit", async () => {
    const id = await addVisit(db(), ME, RED_ROCKS);
    expect(await deleteVisit(db(), OTHER, id)).toBeNull();
    expect(await getVisit(db(), ME, id)).not.toBeNull();
  });
});

describe("trips are private", () => {
  test("someone else's trip list doesn't show my trips", async () => {
    await addTrip(db(), ME, SKI_TRIP);
    expect(await loadTrips(db(), OTHER)).toEqual([]);
    expect((await loadTrips(db(), ME)).map((t) => t.name)).toEqual(["Ski"]);
  });

  test("someone else can't open my trip", async () => {
    const id = await addTrip(db(), ME, SKI_TRIP);
    expect(await getTrip(db(), OTHER, id)).toBeNull();
    expect(await getTrip(db(), ME, id)).toMatchObject({ id, name: "Ski", states: ["CO"] });
  });

  test("someone else can't change my trip, its states or its cities", async () => {
    const id = await addTrip(db(), ME, SKI_TRIP);
    const changed = { ...SKI_TRIP, name: "Changed", states: ["UT"], cities: [] };
    expect(await updateTrip(db(), OTHER, id, changed)).toBe(false);
    expect(await getTrip(db(), ME, id)).toMatchObject({ name: "Ski", states: ["CO"], cities: [{ name: "Aspen", state: "CO" }] });
  });

  test("someone else can't move my trip to another year", async () => {
    const id = await addTrip(db(), ME, SKI_TRIP);
    expect(await setTripDates(db(), OTHER, id, "2028-01-10", "2028-01-12")).toBe(false);
    expect((await getTrip(db(), ME, id))?.startDate).toBe("2027-01-10");
    expect(await setTripDates(db(), ME, id, "2028-01-10", "2028-01-12")).toBe(true);
  });

  test("someone else can't delete my trip", async () => {
    const id = await addTrip(db(), ME, SKI_TRIP);
    expect(await deleteTrip(db(), OTHER, id)).toBe(false);
    expect(await getTrip(db(), ME, id)).not.toBeNull();
  });
});

describe("rows from before accounts", () => {
  test("old visits and trips with no owner (\"\") show up for nobody", async () => {
    await addVisit(db(), "", RED_ROCKS);
    await addTrip(db(), "", SKI_TRIP);
    expect(await visitedStateCount(db(), ME)).toBe(0);
    expect(await loadTrips(db(), ME)).toEqual([]);
  });
});
