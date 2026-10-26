// Slice 27: each visited city's photo, for the map's pop-ups. A city's photo is
// the first photo (oldest upload) of my most recent visit to that city that
// has photos. Only visits with a city count, and only my own photos.
import { describe, expect, test } from "vitest";
import { addPhoto, addTrip, addVisit, cityPhotos, loadTrips, loadVisits } from "@/db/queries";
import { visitedTripCities } from "@/lib/city-photos";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

/** A visit of `who`'s; returns its id. */
const visit = (visitDate: string, city: string | null, state = "CO", who = ME) =>
  addVisit(db(), who, { state, visitDate, note: "", city });

/** Add photo number `n` to a visit of `who`'s; returns the photo's id. */
async function photo(visitId: number, n: number, who = ME): Promise<number> {
  const id = await addPhoto(db(), who, visitId, { fullPath: `photos/x/full-${n}.jpg`, thumbPath: `photos/x/thumb-${n}.jpg`, width: 2000, height: 1333 });
  if (typeof id !== "number") throw new Error(`photo ${n} was not added`);
  return id;
}

describe("a city's photo", () => {
  test("comes from my most recent visit to that city that has photos", async () => {
    const older = await visit("2023-05-01", "Denver");
    await photo(older, 1);
    const newer = await visit("2024-07-04", "Denver");
    const newerPhoto = await photo(newer, 2);
    await visit("2025-03-01", "Denver"); // the newest visit, but it has no photos

    expect((await cityPhotos(db(), ME)).get("CO|Denver")).toEqual({ photoId: newerPhoto, visitDate: "2024-07-04", version: expect.any(String) });
  });

  test("is the first photo (oldest upload) of that visit", async () => {
    const id = await visit("2024-07-04", "Denver");
    const first = await photo(id, 1);
    await photo(id, 2);
    await photo(id, 3);

    expect((await cityPhotos(db(), ME)).get("CO|Denver")?.photoId).toBe(first);
  });

  test("of two visits on the same day, the one added later counts as more recent", async () => {
    await photo(await visit("2024-07-04", "Denver"), 1);
    const later = await photo(await visit("2024-07-04", "Denver"), 2);

    expect((await cityPhotos(db(), ME)).get("CO|Denver")?.photoId).toBe(later);
  });

  test("each city gets its own photo, keyed by state and city", async () => {
    const denver = await photo(await visit("2024-07-04", "Denver"), 1);
    const portland = await photo(await visit("2024-08-01", "Portland", "OR"), 2);

    expect(await cityPhotos(db(), ME)).toEqual(
      new Map([
        ["CO|Denver", { photoId: denver, visitDate: "2024-07-04", version: expect.any(String) }],
        ["OR|Portland", { photoId: portland, visitDate: "2024-08-01", version: expect.any(String) }],
      ]),
    );
  });
});

describe("no photo", () => {
  test("a city whose visits have no photos has none", async () => {
    await visit("2024-07-04", "Denver");
    await visit("2025-03-01", "Denver");

    expect((await cityPhotos(db(), ME)).has("CO|Denver")).toBe(false);
  });

  test("a visit without a city never gives a photo to any city, not even in its state", async () => {
    await visit("2024-07-04", "Denver"); // a city visit in the same state, without photos
    await photo(await visit("2025-03-01", null), 1);

    expect(await cityPhotos(db(), ME)).toEqual(new Map());
  });

  test("no visits at all: no photos", async () => {
    expect(await cityPhotos(db(), ME)).toEqual(new Map());
  });
});

describe("only my own photos", () => {
  test("someone else's photos of the same city never show up for me, and mine never for them", async () => {
    const mine = await photo(await visit("2023-05-01", "Denver"), 1);
    // Someone else's visit to the same city is more recent, with a photo.
    const theirs = await photo(await visit("2025-03-01", "Denver", "CO", OTHER), 2, OTHER);

    expect((await cityPhotos(db(), ME)).get("CO|Denver")?.photoId).toBe(mine);
    expect((await cityPhotos(db(), OTHER)).get("CO|Denver")?.photoId).toBe(theirs);
  });

  test("someone who only has photos elsewhere gets none of mine", async () => {
    await photo(await visit("2024-07-04", "Denver"), 1);

    expect(await cityPhotos(db(), OTHER)).toEqual(new Map());
  });
});

// Slice 28: a trip's visited cities come from my own visits and photos only.
describe("a trip's visited cities", () => {
  /** What `who`'s trips show: their visited trip cities, from their own data. */
  const visitedOnTrips = async (who: string) =>
    visitedTripCities(await loadTrips(db(), who), await loadVisits(db(), who), await cityPhotos(db(), who));

  test("only count my own visits: someone else's visit and photo of the city never show on my trip", async () => {
    // Someone else has visited Denver, with a photo; I haven't.
    await photo(await visit("2024-07-04", "Denver", "CO", OTHER), 1, OTHER);
    // We both plan a trip there.
    const denverTrip = { name: "Denver", startDate: "2099-06-01", endDate: "2099-06-03", states: ["CO"], cities: [{ name: "Denver", state: "CO" }] };
    await addTrip(db(), ME, denverTrip);
    await addTrip(db(), OTHER, denverTrip);

    expect(await visitedOnTrips(ME)).toEqual({});
    expect((await visitedOnTrips(OTHER))["CO|Denver"]?.lastVisit).toBe("2024-07-04");
  });
});
