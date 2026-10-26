// POST /api/visits/<id>/photos: add a photo to one of my visits (slice 18).
// The browser sends the shrunk photo ("full"), its small preview ("thumb") and
// the photo's size. Answers with JSON: { id } (201), or { error } with
// 400 (not a photo), 404 (not my visit), 409 (already 6 photos), 401 (signed out),
// 429 (slice 23: I've used up this month's 50 uploads).

import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { appDatabase } from "@/db/app";
import { addPhoto, canUploadPhoto, countPhotoUpload, getVisit, photosForVisit } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { photoStore } from "@/lib/photo-store";
import { readPhotoUpload } from "@/lib/photo-form";
import { PHOTO_MAX_PER_VISIT, photoLimitMessage, photoPathnames, uploadMonth } from "@/lib/photos";

const FULL_MESSAGE = `A visit can have at most ${PHOTO_MAX_PER_VISIT} photos.`;

/** A JSON answer with this status. */
const answer = (status: number, body: object) => Response.json(body, { status });

export async function POST(request: Request, { params }: RouteContext<"/api/visits/[id]/photos">) {
  await connection();
  const { userId } = await auth();
  if (!userId) return answer(401, { error: "Please sign in again." });

  const visitId = Number((await params).id);
  const db = await appDatabase();
  if (!Number.isInteger(visitId) || !(await getVisit(db, userId, visitId))) return answer(404, { error: "Not found." });
  if ((await photosForVisit(db, userId, visitId)).length >= PHOTO_MAX_PER_VISIT) return answer(409, { error: FULL_MESSAGE });
  // The monthly limit, checked before anything is stored. "429 Too Many
  // Requests" is the web's usual answer for "you've reached a limit".
  const month = uploadMonth(todayIn());
  if (!(await canUploadPhoto(db, userId, month))) return answer(429, { error: photoLimitMessage(month) });

  const upload = await readPhotoUpload(request);
  if (!upload.ok) return answer(400, { error: upload.error });
  const { full, thumb, width, height } = upload.photo;

  // Save the files first, then the row that points at them.
  const paths = photoPathnames(userId, visitId);
  const store = photoStore();
  await store.put(paths.full, full);
  await store.put(paths.thumb, thumb);
  const id = await addPhoto(db, userId, visitId, { fullPath: paths.full, thumbPath: paths.thumb, width, height });
  if (typeof id !== "number") {
    // Another upload filled the visit (or it was deleted) meanwhile: don't keep the files.
    await store.delete([paths.full, paths.thumb]);
    return id === "full" ? answer(409, { error: FULL_MESSAGE }) : answer(404, { error: "Not found." });
  }
  // Only a photo that was really stored counts towards the monthly limit.
  await countPhotoUpload(db, userId, month);
  return answer(201, { id });
}
