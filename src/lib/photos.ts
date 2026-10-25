// The rules for a visit's photos (slice 18): what counts as a photo, how big
// it may be, how many a visit can have, and where each one is stored.
// Slice 23: how many a person can upload in a month.

/** The most photos one visit can have. */
export const PHOTO_MAX_PER_VISIT = 6;

/** The most photos one person can upload in a calendar month (slice 23). Each
 * photo is two uploads to the photo store (the photo and its preview), and the
 * free Vercel Blob plan allows 2,000 a month for everyone together, then stops
 * all uploads for 30 days. 50 photos is 100 of those. */
export const PHOTO_MAX_PER_MONTH = 50;

/** The calendar month a day belongs to, as "YYYY-MM" (from "YYYY-MM-DD"). */
export function uploadMonth(day: string): string {
  return day.slice(0, 7);
}

/** What the page says when someone has used up `month`'s uploads: when they
 * can add more (the 1st of the next month). */
export function photoLimitMessage(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  // Date.UTC with month index `monthNumber` is the next month (indexes start at 0);
  // December rolls over to January of the next year by itself.
  const next = new Date(Date.UTC(year, monthNumber, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `You've added ${PHOTO_MAX_PER_MONTH} photos this month, the most for one month. You can add more from ${next} 1.`;
}

/** The biggest file accepted, in bytes (3 MB). The browser shrinks photos to
 * well under this first; the server checks again. */
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/** What kind of image these bytes are, from their first bytes (the file's
 * "magic number"), or null if they aren't one. A file's name can lie; this can't. */
export function imageType(bytes: Uint8Array): ImageType | null {
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const text = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Check an upload: the photo and its small preview. null if they're fine,
 * otherwise what's wrong, in words for the page. */
export async function checkPhotoFiles(full: File | null, thumb: File | null): Promise<string | null> {
  if (!full || !thumb) return "Choose a photo to add.";
  for (const file of [full, thumb]) {
    if (file.size > PHOTO_MAX_BYTES) return "That photo is too big (at most 3 MB).";
    // Only the first 12 bytes are needed to tell what kind of file it is.
    if (!imageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) return "That file isn't a photo.";
  }
  return null;
}

/** Where a new photo and its preview are stored: in the person's own folder, by
 * visit, under a random name nobody can guess (randomUUID). */
export function photoPathnames(userId: string, visitId: number): { full: string; thumb: string } {
  const name = `photos/${userId}/${visitId}/${crypto.randomUUID()}`;
  return { full: `${name}-full.jpg`, thumb: `${name}-thumb.jpg` };
}
