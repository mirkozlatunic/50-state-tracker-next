"use client";
// The add-visit form's optional "Photos" field (slice 30): choose up to 6
// photos, see a little preview of each, and remove any before saving. Nothing
// is sent here; the form uploads them once the visit is saved.

import { useId, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { NOT_A_PHOTO, pickedPreview } from "@/lib/photo-upload";
import { keepPhotos, PHOTO_MAX_PER_VISIT } from "@/lib/photos";

/** A chosen photo: the file itself and its little preview (a "data:" address). */
export type PickedPhoto = { file: File; preview: string };

const TOO_MANY = `A visit can have at most ${PHOTO_MAX_PER_VISIT} photos.`;

export function PhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  disabled: boolean;
}) {
  const inputId = useId();
  const [problem, setProblem] = useState<string | null>(null);

  /** Make a preview of each chosen file; files that aren't photos are left out. */
  async function pick(files: File[]) {
    setProblem(null);
    const picked: PickedPhoto[] = [];
    let notAPhoto = false;
    for (const file of files) {
      const preview = await pickedPreview(file);
      if (preview) picked.push({ file, preview });
      else notAPhoto = true;
    }
    const { kept, tooMany } = keepPhotos(photos, picked);
    onChange(kept);
    setProblem(tooMany ? TOO_MANY : notAPhoto ? NOT_A_PHOTO : null);
  }

  return (
    // A fieldset groups the field's parts; its legend is the group's name.
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="text-sm font-medium">
        Photos <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <p className="text-sm text-muted-foreground">Up to {PHOTO_MAX_PER_VISIT}.</p>

      {photos.length > 0 && (
        <ul aria-label="Chosen photos" className="flex flex-col gap-2">
          {photos.map((photo, index) => (
            <li key={index} className="flex items-center justify-between gap-3">
              {/* A "data:" picture made in the browser, so next/image has nothing to optimize. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview} alt={`Chosen photo ${index + 1}`} className="size-12 rounded-md bg-muted object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{photo.file.name}</span>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => {
                  setProblem(null);
                  onChange(photos.filter((_, other) => other !== index));
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {photos.length < PHOTO_MAX_PER_VISIT && (
        <div>
          {/* The real file picker is hidden; its label is the button you see.
              accept="image/*" also offers the camera on a phone. */}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = ""; // so the same file can be chosen again
              if (files.length) void pick(files);
            }}
          />
          <label htmlFor={inputId} data-slot="button" className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
            <ImagePlus aria-hidden />
            Choose photos
          </label>
        </div>
      )}

      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
    </fieldset>
  );
}
