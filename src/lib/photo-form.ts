// Reading a photo the browser sent (slice 18; shared since slice 31 by adding
// a photo and replacing one): the shrunk photo ("full"), its small preview
// ("thumb") and the photo's size, each checked. Server only.

import { checkPhotoFiles } from "@/lib/photos";

export type PhotoUpload = { full: Uint8Array; thumb: Uint8Array; width: number; height: number };

/** The photo in a request's form, or why it isn't one. */
export async function readPhotoUpload(request: Request): Promise<{ ok: true; photo: PhotoUpload } | { ok: false; error: string }> {
  const form = await request.formData();
  const fileOf = (name: string) => {
    const value = form.get(name);
    return value instanceof File ? value : null;
  };
  const full = fileOf("full");
  const thumb = fileOf("thumb");
  const problem = await checkPhotoFiles(full, thumb);
  if (problem) return { ok: false, error: problem };
  const width = Math.round(Number(form.get("width")));
  const height = Math.round(Number(form.get("height")));
  if (!(width > 0 && height > 0)) return { ok: false, error: "That file isn't a photo." };
  return {
    ok: true,
    photo: { full: new Uint8Array(await full!.arrayBuffer()), thumb: new Uint8Array(await thumb!.arrayBuffer()), width, height },
  };
}
