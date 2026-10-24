// The rules for a visit's photos (slice 18): what counts as a photo, how big
// it may be, how many a visit can have, and where each one is stored.

/** The most photos one visit can have. */
export const PHOTO_MAX_PER_VISIT = 6;

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
