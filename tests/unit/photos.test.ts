// Slice 18: the rules for a visit's photos: what counts as a photo, how big it
// may be, how many a visit can have, and where each one is stored.
import { describe, expect, test } from "vitest";
import { checkPhotoFiles, imageType, PHOTO_MAX_BYTES, PHOTO_MAX_PER_VISIT, photoPathnames } from "@/lib/photos";

// The first bytes of each kind of image file (its "magic number").
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
const TEXT = new Uint8Array(Buffer.from("not a photo, just text"));

/** A file as the browser would send it. */
const file = (bytes: Uint8Array<ArrayBuffer>, name = "photo.jpg", type = "image/jpeg") => new File([bytes], name, { type });

describe("what counts as a photo", () => {
  test("JPEG, PNG and WebP, recognized by their contents (not their name)", () => {
    expect(imageType(JPEG)).toBe("image/jpeg");
    expect(imageType(PNG)).toBe("image/png");
    expect(imageType(WEBP)).toBe("image/webp");
  });

  test("anything else isn't, even if it's called .jpg", () => {
    expect(imageType(TEXT)).toBeNull();
    expect(imageType(new Uint8Array())).toBeNull();
  });
});

describe("checking an upload (the photo and its small preview)", () => {
  test("a visit can have 6 photos, each at most 3 MB", () => {
    expect(PHOTO_MAX_PER_VISIT).toBe(6);
    expect(PHOTO_MAX_BYTES).toBe(3 * 1024 * 1024);
  });

  test("two real images are fine", async () => {
    expect(await checkPhotoFiles(file(JPEG), file(JPEG, "thumb.jpg"))).toBeNull();
  });

  test("a missing file is refused", async () => {
    expect(await checkPhotoFiles(null, file(JPEG))).toBe("Choose a photo to add.");
    expect(await checkPhotoFiles(file(JPEG), null)).toBe("Choose a photo to add.");
  });

  test("a file that isn't an image is refused, whatever it's called", async () => {
    expect(await checkPhotoFiles(file(TEXT), file(JPEG))).toBe("That file isn't a photo.");
    expect(await checkPhotoFiles(file(JPEG), file(TEXT))).toBe("That file isn't a photo.");
  });

  test("a photo over 3 MB is refused", async () => {
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set(JPEG);
    expect(await checkPhotoFiles(file(big), file(JPEG))).toBe("That photo is too big (at most 3 MB).");
  });
});

describe("where a photo is stored", () => {
  test("in the person's own folder, by visit, with a name nobody can guess", () => {
    const paths = photoPathnames("user_abc", 42);
    expect(paths.full).toMatch(/^photos\/user_abc\/42\/[0-9a-f-]{36}-full\.jpg$/);
    expect(paths.thumb).toBe(paths.full.replace("-full.jpg", "-thumb.jpg"));
  });

  test("every photo gets a new name", () => {
    expect(photoPathnames("user_abc", 42).full).not.toBe(photoPathnames("user_abc", 42).full);
  });
});
