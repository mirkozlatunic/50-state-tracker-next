// Where the photo files live (slice 18). Online: a private Vercel Blob store,
// so photos never get a public address; the app hands them out itself, only to
// their owner (src/app/photos/[id]/route.ts). On the computer and in the tests:
// a local folder that works the same way, so nothing touches the real store.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { del, get, put } from "@vercel/blob";

export interface PhotoStore {
  /** Save a file under `pathname`. */
  put(pathname: string, bytes: Uint8Array): Promise<void>;
  /** The file's bytes, or null if there's no such file. */
  get(pathname: string): Promise<Uint8Array | null>;
  /** Delete these files (files that are already gone are fine). */
  delete(pathnames: string[]): Promise<void>;
}

/** Photos in a folder on this computer. */
export function localPhotoStore(folder: string): PhotoStore {
  const root = resolve(folder);
  /** The file's full path, refusing names like "../x" that would leave the folder. */
  const pathOf = (pathname: string) => {
    const path = resolve(root, pathname);
    if (!path.startsWith(root + sep)) throw new Error(`Not a photo path: ${pathname}`);
    return path;
  };
  return {
    async put(pathname, bytes) {
      const path = pathOf(pathname);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    },
    async get(pathname) {
      const path = pathOf(pathname);
      try {
        return new Uint8Array(await readFile(path));
      } catch {
        return null; // not there
      }
    },
    async delete(pathnames) {
      await Promise.all(pathnames.map((pathname) => rm(pathOf(pathname), { force: true })));
    },
  };
}

/** Photos in the private Vercel Blob store (its key comes from Vercel's settings). */
export function blobPhotoStore(): PhotoStore {
  return {
    async put(pathname, bytes) {
      // Our names are already unique, so no random suffix; "private": no public address.
      await put(pathname, Buffer.from(bytes), { access: "private", addRandomSuffix: false, contentType: "image/jpeg" });
    },
    async get(pathname) {
      const result = await get(pathname, { access: "private" });
      if (!result || result.statusCode !== 200) return null;
      return new Uint8Array(await new Response(result.stream).arrayBuffer());
    },
    async delete(pathnames) {
      if (pathnames.length) await del(pathnames);
    },
  };
}

/** The app's photo store: Blob online, a local folder (PHOTO_DIR, or .photos)
 * on the computer, in the tests (PHOTO_STORE=local), or without a Blob key. */
export function photoStore(): PhotoStore {
  if (process.env.PHOTO_STORE === "local" || !process.env.BLOB_READ_WRITE_TOKEN) {
    return localPhotoStore(process.env.PHOTO_DIR ?? ".photos");
  }
  return blobPhotoStore();
}
