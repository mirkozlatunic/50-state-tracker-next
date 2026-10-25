// Slice 23: each person can upload at most 50 photos per calendar month (Los
// Angeles time), so nobody can use up the photo store's monthly allowance for
// everyone. Uploads are counted, not photos kept: adding and deleting a photo
// still used an upload.
import { describe, expect, test } from "vitest";
import { canUploadPhoto, countPhotoUpload, photoUploadsIn } from "@/db/queries";
import { PHOTO_MAX_PER_MONTH, photoLimitMessage, uploadMonth } from "@/lib/photos";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

/** Count `times` uploads for `userId` in `month`. */
async function upload(userId: string, month: string, times = 1) {
  for (let i = 0; i < times; i++) await countPhotoUpload(db(), userId, month);
}

describe("the monthly limit's rules", () => {
  test("is 50 photos", () => {
    expect(PHOTO_MAX_PER_MONTH).toBe(50);
  });

  test("a month is the calendar month of the day (YYYY-MM)", () => {
    expect(uploadMonth("2026-10-24")).toBe("2026-10");
    expect(uploadMonth("2026-12-31")).toBe("2026-12");
  });

  test("the message says when more can be added (the 1st of next month)", () => {
    expect(photoLimitMessage("2026-10")).toBe(
      "You've added 50 photos this month, the most for one month. You can add more from November 1.",
    );
    expect(photoLimitMessage("2026-12")).toMatch(/from January 1\.$/);
  });
});

describe("counting uploads", () => {
  test("starts at 0, and each upload adds 1", async () => {
    expect(await photoUploadsIn(db(), ME, "2026-10")).toBe(0);
    await upload(ME, "2026-10", 2);
    expect(await photoUploadsIn(db(), ME, "2026-10")).toBe(2);
  });

  test("is per person: my uploads don't count for anyone else", async () => {
    await upload(ME, "2026-10", 3);
    expect(await photoUploadsIn(db(), OTHER, "2026-10")).toBe(0);
  });

  test("starts again each month", async () => {
    await upload(ME, "2026-10", 3);
    expect(await photoUploadsIn(db(), ME, "2026-11")).toBe(0);
  });
});

describe("the limit", () => {
  test("up to 49 uploads, one more is fine; at 50 it's reached", async () => {
    await upload(ME, "2026-10", PHOTO_MAX_PER_MONTH - 1);
    expect(await canUploadPhoto(db(), ME, "2026-10")).toBe(true);
    await upload(ME, "2026-10");
    expect(await canUploadPhoto(db(), ME, "2026-10")).toBe(false);
  });

  test("one person at the limit doesn't block anyone else", async () => {
    await upload(ME, "2026-10", PHOTO_MAX_PER_MONTH);
    expect(await canUploadPhoto(db(), ME, "2026-10")).toBe(false);
    expect(await canUploadPhoto(db(), OTHER, "2026-10")).toBe(true);
  });

  test("it resets on the 1st of the next month", async () => {
    await upload(ME, "2026-10", PHOTO_MAX_PER_MONTH);
    expect(await canUploadPhoto(db(), ME, "2026-11")).toBe(true);
  });
});
