// Slice 18: the photo store. Online the photos live in a private Vercel Blob
// store; on the computer and in the tests, in a local folder that works the
// same way. These tests use the local one, in a temporary folder.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { localPhotoStore, type PhotoStore } from "@/lib/photo-store";

let folder: string;
let store: PhotoStore;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "tracker-photos-"));
  store = localPhotoStore(folder);
});

afterEach(() => rmSync(folder, { recursive: true, force: true }));

describe("the local photo store", () => {
  test("a saved photo comes back with the same bytes", async () => {
    await store.put("photos/user_a/1/x-full.jpg", new Uint8Array([1, 2, 3]));
    expect([...(await store.get("photos/user_a/1/x-full.jpg"))!]).toEqual([1, 2, 3]);
  });

  test("a photo that isn't there gives null", async () => {
    expect(await store.get("photos/user_a/1/missing.jpg")).toBeNull();
  });

  test("deleted photos are gone (deleting a missing one is fine)", async () => {
    await store.put("photos/user_a/1/a.jpg", new Uint8Array([1]));
    await store.put("photos/user_a/1/b.jpg", new Uint8Array([2]));
    await store.delete(["photos/user_a/1/a.jpg", "photos/user_a/1/b.jpg", "photos/user_a/1/never.jpg"]);
    expect(await store.get("photos/user_a/1/a.jpg")).toBeNull();
    expect(await store.get("photos/user_a/1/b.jpg")).toBeNull();
  });

  test("refuses names that would reach outside its folder", async () => {
    await expect(store.put("../outside.jpg", new Uint8Array([1]))).rejects.toThrow();
    await expect(store.get("photos/../../outside.jpg")).rejects.toThrow();
  });
});
