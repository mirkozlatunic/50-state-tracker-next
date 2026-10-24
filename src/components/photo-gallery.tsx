"use client";
// A visit's photos on its visit page (slice 18): small previews, "Add photos",
// and a pop-up with the big photo and "Delete photo". Before uploading, the
// browser shrinks each photo (at most 2000 px) and makes a 400 px preview.
// Drawing the photo again on a canvas also leaves out its Exif data, where
// phones keep the place a photo was taken.

import { useId, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { removePhoto } from "@/app/(app)/visits/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PHOTO_MAX_PER_VISIT } from "@/lib/photos";

export type GalleryPhoto = { id: number; width: number; height: number };

const FULL_SIZE = 2000; // longest side of a stored photo, in pixels
const THUMB_SIZE = 400; // longest side of a preview
const NOT_A_PHOTO = "That file isn't a photo.";
const TOO_MANY = `A visit can have at most ${PHOTO_MAX_PER_VISIT} photos.`;

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

/** Shrink one chosen file and send it. null when it worked, otherwise why not. */
async function upload(visitId: number, file: File): Promise<string | null> {
  let image: ImageBitmap;
  try {
    // createImageBitmap reads the photo (turned the right way up, as the camera
    // took it); it fails for files that aren't images.
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return NOT_A_PHOTO;
  }
  const full = await shrink(image, FULL_SIZE, 0.85);
  const thumb = await shrink(image, THUMB_SIZE, 0.75);
  image.close();
  const form = new FormData();
  form.set("full", full.blob, "photo.jpg");
  form.set("thumb", thumb.blob, "thumb.jpg");
  form.set("width", String(full.width));
  form.set("height", String(full.height));
  const response = await fetch(`/api/visits/${visitId}/photos`, { method: "POST", body: form });
  if (response.ok) return null;
  const body = await response.json().catch(() => null);
  return body?.error ?? "That photo couldn't be added. Please try again.";
}

export function PhotoGallery({ visitId, photos }: { visitId: number; photos: GalleryPhoto[] }) {
  const router = useRouter();
  const inputId = useId();
  const [busy, setBusy] = useState<string | null>(null); // "Adding photo 1 of 3…"
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null); // which photo is shown big
  const room = PHOTO_MAX_PER_VISIT - photos.length;

  /** Upload the chosen files one after the other, as many as there's room for. */
  async function addFiles(files: File[]) {
    setError(null);
    const toAdd = files.slice(0, room);
    let problem: string | null = files.length > room ? TOO_MANY : null;
    for (const [index, file] of toAdd.entries()) {
      setBusy(`Adding photo ${index + 1} of ${toAdd.length}…`);
      const failed = await upload(visitId, file);
      if (failed) {
        problem = failed;
        break;
      }
    }
    setBusy(null);
    setError(problem);
    router.refresh(); // show the new photos
  }

  const shown = open === null ? null : photos[open];
  return (
    <div className="flex flex-col gap-3">
      {photos.length === 0 ? (
        <p className="text-muted-foreground">No photos yet.</p>
      ) : (
        <ul aria-label="Photos of this visit" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                data-photo-id={photo.id}
                aria-label={`Open photo ${index + 1} of ${photos.length}`}
                onClick={() => setOpen(index)}
                className="block aspect-square w-full overflow-hidden rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
              >
                {/* unoptimized: /photos/... is private, so Next.js can't fetch it to resize. */}
                <Image src={`/photos/${photo.id}?size=thumb`} alt="" width={400} height={400} unoptimized className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {room > 0 && (
          <>
            {/* The real file picker is hidden; its label is the button you see.
                accept="image/*" also offers the camera on a phone. */}
            <input
              id={inputId}
              type="file"
              accept="image/*"
              multiple
              disabled={busy !== null}
              className="sr-only"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                event.target.value = ""; // so the same file can be chosen again
                if (files.length) void addFiles(files);
              }}
            />
            <label htmlFor={inputId} data-slot="button" className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
              <ImagePlus aria-hidden />
              Add photos
            </label>
          </>
        )}
        {photos.length > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {photos.length} of {PHOTO_MAX_PER_VISIT} photos
          </span>
        )}
      </div>
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Dialog open={shown !== null} onOpenChange={(isOpen) => !isOpen && setOpen(null)}>
        {shown && open !== null && (
          // pt-14: room above the photo for the pop-up's ✕ (close) button (44 px tall on phones).
          <DialogContent className="pt-14 sm:max-w-3xl">
            <DialogTitle className="sr-only">
              Photo {open + 1} of {photos.length}
            </DialogTitle>
            <Image
              src={`/photos/${shown.id}`}
              alt={`Photo ${open + 1} of ${photos.length}`}
              width={shown.width}
              height={shown.height}
              unoptimized
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
            <DeletePhotoButton photoId={shown.id} onDeleted={() => setOpen(null)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** "Delete photo", asking first. */
function DeletePhotoButton({ photoId, onDeleted }: { photoId: number; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        data-slot="button"
        render={<Button variant="ghost" className="justify-self-start text-destructive hover:bg-destructive/10 hover:text-destructive" />}
      >
        Delete photo
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
          <AlertDialogDescription>It will be gone for good.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form
            action={async () => {
              await removePhoto(photoId);
              onDeleted();
            }}
          >
            <AlertDialogAction type="submit" variant="destructive" className="w-full">
              Delete
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
