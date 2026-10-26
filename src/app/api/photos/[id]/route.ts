// PUT /api/photos/<id>: replace one of my photos (slice 31). The browser sends
// the new photo the same way as when adding one ("full", "thumb", its size).
// The photo keeps its id (so its place and its role as a city's photo); it
// gets the new files, and the old ones are deleted. It counts as one upload
// towards the month's limit. Answers with JSON: { id } (200), or { error } with
// 400 (not a photo), 404 (not my photo), 401 (signed out), 429 (monthly limit).
// When it's refused, the old photo stays as it was.

import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { appDatabase } from "@/db/app";
import { canUploadPhoto, countPhotoUpload, getPhoto, replacePhoto } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { readPhotoUpload } from "@/lib/photo-form";
import { photoStore } from "@/lib/photo-store";
import { photoLimitMessage, photoPathnames, uploadMonth } from "@/lib/photos";

/** A JSON answer with this status. */
const answer = (status: number, body: object) => Response.json(body, { status });

export async function PUT(request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  await connection();
  const { userId } = await auth();
  if (!userId) return answer(401, { error: "Please sign in again." });

  const id = Number((await params).id);
  const db = await appDatabase();
  const photo = Number.isInteger(id) ? await getPhoto(db, userId, id) : null;
  if (!photo) return answer(404, { error: "Not found." }); // someone else's acts as if it didn't exist
  const month = uploadMonth(todayIn());
  if (!(await canUploadPhoto(db, userId, month))) return answer(429, { error: photoLimitMessage(month) });

  const upload = await readPhotoUpload(request);
  if (!upload.ok) return answer(400, { error: upload.error });

  // Save the new files first (new random names, so a new version), then point the photo at them.
  const paths = photoPathnames(userId, photo.visitId);
  const store = photoStore();
  await store.put(paths.full, upload.photo.full);
  await store.put(paths.thumb, upload.photo.thumb);
  const oldFiles = await replacePhoto(db, userId, id, {
    fullPath: paths.full,
    thumbPath: paths.thumb,
    width: upload.photo.width,
    height: upload.photo.height,
  });
  if (!oldFiles) {
    // The photo was deleted meanwhile: don't keep the new files.
    await store.delete([paths.full, paths.thumb]);
    return answer(404, { error: "Not found." });
  }
  await store.delete(oldFiles);
  await countPhotoUpload(db, userId, month);
  return answer(200, { id });
}
