// Slice 31: replacing a photo. The photo keeps its id (so its place in the
// visit, and its role as a city's photo), but gets new files and a new size;
// the old files are given back to be deleted. Only my own photos.
// Each photo's address carries a short "version" made from its file's name, so
// a replaced photo gets a new address and the browser can't show an old copy.
import { describe, expect, test } from "vitest";
import { addPhoto, addVisit, cityPhotos, getPhoto, photosForVisit, replacePhoto } from "@/db/queries";
import { photoSrc, photoVersion } from "@/lib/photos";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

/** A Denver visit of `who`'s with photos 1..count; returns the visit and photo ids. */
async function visitWithPhotos(count: number, who = ME) {
  const visitId = await addVisit(db(), who, { state: "CO", visitDate: "2024-07-04", note: "", city: "Denver" });
  const ids: number[] = [];
  for (let n = 1; n <= count; n++) {
    const id = await addPhoto(db(), who, visitId, { fullPath: `photos/x/full-${n}.jpg`, thumbPath: `photos/x/thumb-${n}.jpg`, width: 400, height: 400 });
    if (typeof id !== "number") throw new Error("photo not added");
    ids.push(id);
  }
  return { visitId, ids };
}

const NEW_FILES = { fullPath: "photos/x/new-full.jpg", thumbPath: "photos/x/new-thumb.jpg", width: 2000, height: 1333 };

describe("replacePhoto", () => {
  test("swaps the files and size, keeps the id and visit, and gives back the old files", async () => {
    const { visitId, ids } = await visitWithPhotos(2);

    expect(await replacePhoto(db(), ME, ids[0], NEW_FILES)).toEqual(["photos/x/full-1.jpg", "photos/x/thumb-1.jpg"]);
    expect(await getPhoto(db(), ME, ids[0])).toEqual({ id: ids[0], visitId, ...NEW_FILES });
    // Same photos, same order; the other one is untouched.
    expect((await photosForVisit(db(), ME, visitId)).map((photo) => photo.id)).toEqual(ids);
    expect((await getPhoto(db(), ME, ids[1]))?.fullPath).toBe("photos/x/full-2.jpg");
  });

  test("someone else's photo: nothing changes, and null", async () => {
    const { ids } = await visitWithPhotos(1, OTHER);

    expect(await replacePhoto(db(), ME, ids[0], NEW_FILES)).toBeNull();
    expect((await getPhoto(db(), OTHER, ids[0]))?.fullPath).toBe("photos/x/full-1.jpg");
  });

  test("a photo that doesn't exist: null", async () => {
    expect(await replacePhoto(db(), ME, 9999, NEW_FILES)).toBeNull();
  });

  test("a replaced first photo is still the city's photo, with a new version", async () => {
    const { ids } = await visitWithPhotos(2);
    const before = (await cityPhotos(db(), ME)).get("CO|Denver");
    await replacePhoto(db(), ME, ids[0], NEW_FILES);
    const after = (await cityPhotos(db(), ME)).get("CO|Denver");

    expect(after?.photoId).toBe(ids[0]);
    expect(after?.version).toBe(photoVersion(NEW_FILES.fullPath));
    expect(after?.version).not.toBe(before?.version);
  });
});

describe("a photo's address", () => {
  test("the version is short, safe in an address, and the same for the same file", () => {
    const version = photoVersion("photos/user_1/12/0b6f-full.jpg");
    expect(version).toMatch(/^[a-z0-9]{1,12}$/);
    expect(photoVersion("photos/user_1/12/0b6f-full.jpg")).toBe(version);
  });

  test("a different file gives a different version", () => {
    expect(photoVersion("photos/user_1/12/aaaa-full.jpg")).not.toBe(photoVersion("photos/user_1/12/bbbb-full.jpg"));
  });

  test("it never shows where the file is stored (no user id or folder)", () => {
    expect(photoVersion("photos/user_1/12/0b6f-full.jpg")).not.toContain("user");
  });

  test("the photo and its preview", () => {
    expect(photoSrc(7, "k3j2h1")).toBe("/photos/7?v=k3j2h1");
    expect(photoSrc(7, "k3j2h1", "thumb")).toBe("/photos/7?size=thumb&v=k3j2h1");
  });
});
