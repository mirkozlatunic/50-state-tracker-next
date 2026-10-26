"use client";
// The visit form, for adding and for editing. A client component, so the city
// search can follow the chosen state, and errors show without losing what was typed.
// Slice 30: adding a visit can include photos. The visit is saved first, then
// the browser uploads each photo to it, then goes to the state page.

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveVisit, type VisitFormState } from "@/app/(app)/visits/actions";
import { CityPicker } from "@/components/city-picker";
import { FormActions } from "@/components/form-actions";
import { PhotoPicker, type PickedPhoto } from "@/components/photo-picker";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATES } from "@/lib/data/states";
import { uploadPhoto } from "@/lib/photo-upload";
import { photoFailedMessage } from "@/lib/photos";
import type { VisitFormValues } from "@/lib/visit-form";

// The menu's choices; Base UI uses them to show the chosen state's name.
const STATE_ITEMS = STATES.map(([code, name]) => ({ value: code, label: name }));

/** The form's result: the server's answer, plus (slice 30) a photo that
 * couldn't be added after the visit was saved. */
type FormResult = VisitFormState & { photoFailed?: { message: string; visitId: number } };

export function VisitForm({
  visitId,
  initial,
  today,
  saveLabel,
  cancelHref,
}: {
  visitId: number | null;
  initial: VisitFormValues;
  today: string;
  saveLabel: string;
  cancelHref: string;
}) {
  const router = useRouter();
  // The photos chosen while adding (kept here, so they survive an error below).
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [progress, setProgress] = useState<string | null>(null); // "Adding photo 1 of 2…"

  /** Send the form. With photos: save the visit, upload each photo to it,
   * then go to the state page; stop at the first photo that can't be added. */
  async function submit(previous: FormResult, form: FormData): Promise<FormResult> {
    if (photos.length > 0) form.set("with_photos", "1");
    const answer = await saveVisit(visitId, previous, form);
    if (!answer.saved) return answer;
    for (const [index, photo] of photos.entries()) {
      setProgress(`Adding photo ${index + 1} of ${photos.length}…`);
      const failed = await uploadPhoto(answer.saved.visitId, photo.file);
      if (failed) {
        setProgress(null);
        return { ...answer, photoFailed: { message: photoFailedMessage(index + 1, photos.length, failed), visitId: answer.saved.visitId } };
      }
    }
    router.push(answer.saved.next);
    return answer;
  }

  // useActionState runs `submit` when the form is sent and keeps its result.
  const [result, action, pending] = useActionState<FormResult, FormData>(submit, { errors: [], values: null });

  // The visit is saved, but a photo wasn't: say so, and don't offer to save it again.
  if (result.photoFailed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {result.photoFailed.message}
        </p>
        <Link href={`/visits/${result.photoFailed.visitId}#photos`} className={buttonVariants()} data-slot="button">
          Open the visit
        </Link>
      </div>
    );
  }

  const values = result.values ?? initial;
  // The state and city are kept here, so the city search knows the state.
  // `key` below starts the form fresh with the typed values after an error.
  return (
    <FormFields
      key={JSON.stringify(values)}
      {...{ values, today, saveLabel, cancelHref, action, pending, errors: result.errors, progress }}
      // Only a new visit gets the photo field; a saved one has its own page for photos.
      photoField={visitId === null ? <PhotoPicker photos={photos} onChange={setPhotos} disabled={pending} /> : null}
    />
  );
}

/** The fields themselves. */
function FormFields({
  values,
  today,
  saveLabel,
  cancelHref,
  action,
  pending,
  errors,
  progress,
  photoField,
}: {
  values: VisitFormValues;
  today: string;
  saveLabel: string;
  cancelHref: string;
  action: (form: FormData) => void;
  pending: boolean;
  errors: string[];
  progress: string | null;
  photoField: React.ReactNode;
}) {
  const [state, setState] = useState(values.state);
  const [city, setCity] = useState(values.city);

  return (
    <form action={action} className="flex flex-col gap-4">
      {errors.length > 0 && (
        <ul role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Label id="state-label">State</Label>
        <Select
          name="state"
          items={STATE_ITEMS}
          value={state || null}
          onValueChange={(code) => {
            setState(code ?? "");
            setCity(""); // a city belongs to one state
          }}
        >
          <SelectTrigger aria-labelledby="state-label" className="w-full">
            <SelectValue placeholder="Choose a state" />
          </SelectTrigger>
          <SelectContent>
            {STATE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label id="city-label">
          City <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <CityPicker state={state} city={city} onCityChange={setCity} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="visit_date">Visit date</Label>
        <Input id="visit_date" name="visit_date" type="date" max={today} defaultValue={values.visitDate} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="note" name="note" defaultValue={values.note} />
      </div>

      {photoField}

      <p className="text-sm text-muted-foreground">
        Only count a state if you spent time there outside the airport. Layovers don&apos;t count.
      </p>

      {progress && (
        <p role="status" className="text-sm text-muted-foreground">
          {progress}
        </p>
      )}

      <FormActions cancelHref={cancelHref} saveLabel={saveLabel} pending={pending} />
    </form>
  );
}
