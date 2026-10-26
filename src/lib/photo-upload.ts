// Sending a photo from the browser (slice 18; shared since slice 30 by the
// visit page and the add-visit form; replacing one since slice 31). Before uploading, the browser shrinks
// each photo (at most 2000 px) and makes a 400 px preview. Drawing the photo
// again on a canvas also leaves out its Exif data, where phones keep the place
// a photo was taken. Browser only: it uses the canvas and fetch.

const FULL_SIZE = 2000; // longest side of a stored photo, in pixels
const THUMB_SIZE = 400; // longest side of a preview
const PICKED_SIZE = 96; // longest side of the add-visit form's little previews
export const NOT_A_PHOTO = "That file isn't a photo.";

/** Draw `image` at most `longest` px on its longest side, as a JPEG. */
async function shrink(image: ImageBitmap, longest: number, quality: number) {
  const scale = Math.min(1, longest / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", quality));
  if (!blob) throw new Error(NOT_A_PHOTO);
  return { blob, width: canvas.width, height: canvas.height };
}

/** Read a chosen file as an image, or null if it isn't one. createImageBitmap
 * turns the photo the right way up, as the camera took it. */
async function readImage(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
}

/** Shrink one chosen file and send it: as a new photo of one of my visits
 * (POST), or in place of one of my photos (PUT, slice 31). null when it
 * worked, otherwise why not (the server's own reason when it refused). */
async function sendPhoto(url: string, method: "POST" | "PUT", file: File): Promise<string | null> {
  const image = await readImage(file);
  if (!image) return NOT_A_PHOTO;
  const full = await shrink(image, FULL_SIZE, 0.85);
  const thumb = await shrink(image, THUMB_SIZE, 0.75);
  image.close();
  const form = new FormData();
  form.set("full", full.blob, "photo.jpg");
  form.set("thumb", thumb.blob, "thumb.jpg");
  form.set("width", String(full.width));
  form.set("height", String(full.height));
  const response = await fetch(url, { method, body: form });
  if (response.ok) return null;
  const body = await response.json().catch(() => null);
  return body?.error ?? "That photo couldn't be added. Please try again.";
}

/** Add a chosen file to one of my visits. null when it worked, otherwise why not. */
export function uploadPhoto(visitId: number, file: File): Promise<string | null> {
  return sendPhoto(`/api/visits/${visitId}/photos`, "POST", file);
}

/** Put a chosen file in place of one of my photos (slice 31). null when it worked, otherwise why not. */
export function replacePhotoFile(photoId: number, file: File): Promise<string | null> {
  return sendPhoto(`/api/photos/${photoId}`, "PUT", file);
}

/** A little preview of a chosen file for the add-visit form, as a "data:"
 * address (the picture written into the address itself, so nothing needs
 * cleaning up later), or null if the file isn't a photo. */
export async function pickedPreview(file: File): Promise<string | null> {
  const image = await readImage(file);
  if (!image) return null;
  const { blob } = await shrink(image, PICKED_SIZE, 0.7);
  image.close();
  return new Promise((done) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result));
    reader.onerror = () => done(null);
    reader.readAsDataURL(blob);
  });
}
