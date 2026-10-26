// GET /photos/<id> (the photo) and /photos/<id>?size=thumb (its small preview).
// The photo store is private, so this is the only way to see a photo, and only
// its owner can: anyone else gets 404, as if it didn't exist (slice 18).
// The app's addresses also carry the photo's version, ?v=... (slice 31).

import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { appDatabase } from "@/db/app";
import { getPhoto } from "@/db/queries";
import { photoStore } from "@/lib/photo-store";
import { imageType } from "@/lib/photos";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(request: Request, { params }: RouteContext<"/photos/[id]">) {
  await connection(); // read on every request, never at build time
  const { userId } = await auth();
  if (!userId) return notFound();
  const id = Number((await params).id);
  const photo = Number.isInteger(id) ? await getPhoto(await appDatabase(), userId, id) : null;
  if (!photo) return notFound();

  const query = new URL(request.url).searchParams;
  const thumb = query.get("size") === "thumb";
  const bytes = await photoStore().get(thumb ? photo.thumbPath : photo.fullPath);
  if (!bytes) return notFound();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": imageType(bytes) ?? "application/octet-stream",
      // With a version (?v=..., slice 31) the address never shows another
      // picture (a replaced photo gets a new version), so this browser may keep
      // it for a year. Without one, it must ask again each time. "private": no
      // shared cache may keep a copy.
      "Cache-Control": query.has("v") ? "private, max-age=31536000, immutable" : "private, no-cache",
    },
  });
}
