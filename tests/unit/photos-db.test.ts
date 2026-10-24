// Slice 18: a visit's photos in the database (the photo files themselves live
// in the photo store; the database keeps where they are, and whose they are).
import { describe, expect, test } from "vitest";
import {
  addPhoto,
  addVisit,
  deletePhoto,
  deleteVisit,
  getPhoto,
  photoCounts,
  photoPathsForVisit,
  photosForVisit,
} from "@/db/queries";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

/** A visit of mine, and the details of one uploaded photo (numbered n). */
const visit = () => addVisit(db(), ME, { state: "CO", visitDate: "2024-07-04", note: "", city: null });
const photo = (n: number) => ({ fullPath: `photos/x/full-${n}.jpg`, thumbPath: `photos/x/thumb-${n}.jpg`, width: 2000, height: 1333 });

describe("a visit's photos", () => {
  test("an added photo comes back, oldest first", async () => {
    const visitId = await visit();
    const first = await addPhoto(db(), ME, visitId, photo(1));
    const second = await addPhoto(db(), ME, visitId, photo(2));
    expect(await photosForVisit(db(), ME, visitId)).toEqual([
      { id: first, visitId, ...photo(1) },
      { id: second, visitId, ...photo(2) },
    ]);
    expect(await getPhoto(db(), ME, second as number)).toEqual({ id: second, visitId, ...photo(2) });
  });

  test("a visit can have at most 6 photos", async () => {
    const visitId = await visit();
    for (let n = 1; n <= 6; n++) expect(typeof (await addPhoto(db(), ME, visitId, photo(n)))).toBe("number");
    expect(await addPhoto(db(), ME, visitId, photo(7))).toBe("full");
    expect(await photosForVisit(db(), ME, visitId)).toHaveLength(6);
  });

  test("deleting a photo gives back its files to remove from the store", async () => {
    const visitId = await visit();
    const id = (await addPhoto(db(), ME, visitId, photo(1))) as number;
    expect(await deletePhoto(db(), ME, id)).toEqual(["photos/x/full-1.jpg", "photos/x/thumb-1.jpg"]);
    expect(await getPhoto(db(), ME, id)).toBeNull();
    expect(await deletePhoto(db(), ME, id)).toBeNull(); // already gone
  });

  test("deleting a visit deletes its photos too; their files are listed first", async () => {
    const visitId = await visit();
    await addPhoto(db(), ME, visitId, photo(1));
    await addPhoto(db(), ME, visitId, photo(2));
    expect(await photoPathsForVisit(db(), ME, visitId)).toEqual([
      "photos/x/full-1.jpg",
      "photos/x/thumb-1.jpg",
      "photos/x/full-2.jpg",
      "photos/x/thumb-2.jpg",
    ]);
    await deleteVisit(db(), ME, visitId);
    expect(await photosForVisit(db(), ME, visitId)).toEqual([]);
  });

  test("counts photos per visit, for the state page", async () => {
    const a = await visit();
    const b = await visit();
    await addPhoto(db(), ME, a, photo(1));
    await addPhoto(db(), ME, a, photo(2));
    expect(await photoCounts(db(), ME, [a, b])).toEqual(new Map([[a, 2]]));
  });
});

describe("photos are private", () => {
  test("someone else can't add a photo to my visit", async () => {
    const visitId = await visit();
    expect(await addPhoto(db(), OTHER, visitId, photo(1))).toBeNull();
    expect(await photosForVisit(db(), ME, visitId)).toEqual([]);
  });

  test("someone else can't see, list, count or delete my photos", async () => {
    const visitId = await visit();
    const id = (await addPhoto(db(), ME, visitId, photo(1))) as number;
    expect(await getPhoto(db(), OTHER, id)).toBeNull();
    expect(await photosForVisit(db(), OTHER, visitId)).toEqual([]);
    expect(await photoCounts(db(), OTHER, [visitId])).toEqual(new Map());
    expect(await photoPathsForVisit(db(), OTHER, visitId)).toEqual([]);
    expect(await deletePhoto(db(), OTHER, id)).toBeNull();
    expect(await getPhoto(db(), ME, id)).not.toBeNull();
  });
});
