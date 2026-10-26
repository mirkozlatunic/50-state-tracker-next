"use client";
// A visit's photos on its visit page (slice 18): small previews, "Add photos",
// and a pop-up with the big photo and "Delete photo". Shrinking and sending
// each photo is in photo-upload.ts (shared with the add-visit form since slice 30).
// Slice 31: "Replace photo" in the pop-up puts a new file in a photo's place.

import { useId, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, RefreshCw } from "lucide-react";
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
import { replacePhotoFile, uploadPhoto } from "@/lib/photo-upload";
import { PHOTO_MAX_PER_VISIT, photoSrc } from "@/lib/photos";

/** A photo as the gallery shows it; `version` is part of its address (slice 31). */
export type GalleryPhoto = { id: number; width: number; height: number; version: string };

const TOO_MANY = `A visit can have at most ${PHOTO_MAX_PER_VISIT} photos.`;

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
      const failed = await uploadPhoto(visitId, file);
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
                <Image src={photoSrc(photo.id, photo.version, "thumb")} alt="" width={400} height={400} unoptimized className="size-full object-cover" />
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
              src={photoSrc(shown.id, shown.version)}
              alt={`Photo ${open + 1} of ${photos.length}`}
              width={shown.width}
              height={shown.height}
              unoptimized
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
            <PhotoActions photoId={shown.id} onDeleted={() => setOpen(null)} onReplaced={() => router.refresh()} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** The pop-up's buttons: "Replace photo" and "Delete photo", on one line,
 * with what's happening (or what went wrong) below. */
function PhotoActions({ photoId, onDeleted, onReplaced }: { photoId: number; onDeleted: () => void; onReplaced: () => void }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Send the chosen file in place of this photo; on success, show the new one. */
  async function replace(file: File) {
    setError(null);
    setBusy(true);
    const failed = await replacePhotoFile(photoId, file);
    setBusy(false);
    if (failed) setError(failed);
    else onReplaced(); // reload the page's data: the photo comes back with its new version
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* The real file picker is hidden; its label is the button you see. */}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = ""; // so the same file can be chosen again
            if (file) void replace(file);
          }}
        />
        <label htmlFor={inputId} data-slot="button" className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
          <RefreshCw aria-hidden />
          Replace photo
        </label>
        <DeletePhotoButton photoId={photoId} onDeleted={onDeleted} />
      </div>
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          Replacing the photo…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
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
