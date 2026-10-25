// Slice 24: when someone deletes their account, everything they stored here
// goes: visits, trips (with their states and cities), photos (rows and files),
// settings, share link and upload counts. Nobody else's data is touched.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Database } from "@/db";
import {
  addPhoto,
  addTrip,
  addVisit,
  countPhotoUpload,
  deleteUserData,
  loadTrips,
  loadVisits,
  photoUploadsIn,
  setCelebratedMilestone,
  shareId,
  startSharing,
} from "@/db/queries";
import { deleteAccount } from "@/lib/account-deletion";
import { localPhotoStore, type PhotoStore } from "@/lib/photo-store";
import { photoFolder } from "@/lib/photos";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

let folder: string;
let store: PhotoStore;
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "tracker-photos-"));
  store = localPhotoStore(folder);
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));

/** Give `userId` one of everything: a visit with a photo (and its files), a
 * trip with a state and a city, settings with a share link, an upload count. */
async function fillTracker(userId: string) {
  const visitId = await addVisit(db(), userId, { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
  const paths = { fullPath: `${photoFolder(userId)}${visitId}/a-full.jpg`, thumbPath: `${photoFolder(userId)}${visitId}/a-thumb.jpg` };
  await store.put(paths.fullPath, new Uint8Array([1]));
  await store.put(paths.thumbPath, new Uint8Array([2]));
  await addPhoto(db(), userId, visitId, { ...paths, width: 10, height: 10 });
  await addTrip(db(), userId, {
    name: "Utah",
    startDate: "2030-05-01",
    endDate: "2030-05-03",
    states: ["UT"],
    cities: [{ name: "Moab", state: "UT" }],
  });
  await setCelebratedMilestone(db(), userId, 10);
  await startSharing(db(), userId);
  await countPhotoUpload(db(), userId, "2026-10");
  return paths;
}

/** How many rows of `table` belong to `userId` (trip_states/trip_cities through their trip). */
async function rowsOf(database: Database, table: string, userId: string): Promise<number> {
  const where =
    table === "trip_states" || table === "trip_cities"
      ? "trip_id IN (SELECT id FROM trips WHERE user_id = ?)"
      : "user_id = ?";
  const result = await database.$client.execute({ sql: `SELECT count(*) AS n FROM ${table} WHERE ${where}`, args: [userId] });
  return Number(result.rows[0].n);
}

const TABLES = ["visits", "trips", "trip_states", "trip_cities", "visit_photos", "user_settings", "photo_uploads"];

describe("a person's photo folder", () => {
  test("is photos/<their id>/", () => {
    expect(photoFolder("user_2abcXYZ")).toBe("photos/user_2abcXYZ/");
  });

  test("refuses an empty or odd id, so it can never point at everyone's photos", () => {
    for (const bad of ["", "..", "user/x", "user_a/../user_b", " "]) expect(() => photoFolder(bad), JSON.stringify(bad)).toThrow();
  });
});

describe("the local photo store's folder delete", () => {
  test("deletes everything in that folder, and nothing outside it", async () => {
    await store.put("photos/user_a/1/x.jpg", new Uint8Array([1]));
    await store.put("photos/user_a/2/y.jpg", new Uint8Array([2]));
    await store.put("photos/user_ab/1/z.jpg", new Uint8Array([3])); // a name that starts the same
    await store.deleteFolder("photos/user_a/");
    expect(await store.get("photos/user_a/1/x.jpg")).toBeNull();
    expect(await store.get("photos/user_a/2/y.jpg")).toBeNull();
    expect(await store.get("photos/user_ab/1/z.jpg")).not.toBeNull();
  });

  test("a folder that isn't there is fine", async () => {
    await expect(store.deleteFolder("photos/user_nobody/")).resolves.toBeUndefined();
  });
});

describe("deleting a person's data", () => {
  test("removes all of their rows, in every table", async () => {
    await fillTracker(ME);
    for (const table of TABLES) expect(await rowsOf(db(), table, ME), table).toBeGreaterThan(0);
    await deleteUserData(db(), ME);
    for (const table of TABLES) expect(await rowsOf(db(), table, ME), table).toBe(0);
    expect(await shareId(db(), ME)).toBeNull();
  });

  test("leaves everyone else's data alone (including rows with no owner)", async () => {
    await fillTracker(ME);
    await fillTracker(OTHER);
    await addVisit(db(), "", { state: "TX", visitDate: "2020-01-01", note: "", city: null });
    const before = await Promise.all(TABLES.map((table) => rowsOf(db(), table, OTHER)));
    await deleteUserData(db(), ME);
    expect(await Promise.all(TABLES.map((table) => rowsOf(db(), table, OTHER)))).toEqual(before);
    expect(await loadVisits(db(), OTHER)).toHaveLength(1);
    expect(await loadTrips(db(), OTHER)).toHaveLength(1);
    expect(await shareId(db(), OTHER)).not.toBeNull();
    expect(await photoUploadsIn(db(), OTHER, "2026-10")).toBe(1);
    expect(await rowsOf(db(), "visits", "")).toBe(1);
  });

  test("refuses an empty id (rows with no owner are nobody's to delete)", async () => {
    await expect(deleteUserData(db(), "")).rejects.toThrow();
  });
});

describe("deleting an account (rows and photo files)", () => {
  test("removes the person's rows and their photo files; other people's files stay", async () => {
    const mine = await fillTracker(ME);
    const theirs = await fillTracker(OTHER);
    await deleteAccount(db(), store, ME);
    for (const table of TABLES) expect(await rowsOf(db(), table, ME), table).toBe(0);
    expect(await store.get(mine.fullPath)).toBeNull();
    expect(await store.get(mine.thumbPath)).toBeNull();
    expect(await store.get(theirs.fullPath)).not.toBeNull();
    expect(await rowsOf(db(), "visits", OTHER)).toBe(1);
  });

  test("also removes leftover files that no row points at", async () => {
    await store.put(`${photoFolder(ME)}99/left-over.jpg`, new Uint8Array([9]));
    await deleteAccount(db(), store, ME);
    expect(await store.get(`${photoFolder(ME)}99/left-over.jpg`)).toBeNull();
  });

  test("running it twice is fine (Clerk may send the same event again)", async () => {
    await fillTracker(ME);
    await deleteAccount(db(), store, ME);
    await expect(deleteAccount(db(), store, ME)).resolves.toBeUndefined();
  });
});
