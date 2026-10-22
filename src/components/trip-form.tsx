"use client";
// The trip form, for planning and for editing. A client component, so the city
// search can follow the ticked states, and errors show without losing what was typed.

import { useActionState, useState } from "react";
import { saveTrip, type TripFormState } from "@/app/(app)/trips/actions";
import { FormActions } from "@/components/form-actions";
import { TripCityPicker } from "@/components/trip-city-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATES } from "@/lib/data/states";
import type { TripFormValues } from "@/lib/trip-form";

type Props = {
  tripId: number | null;
  initial: TripFormValues;
  startMin: string;
  startMax: string | null;
  saveLabel: string;
  returnTo: string;
};

export function TripForm({ tripId, initial, startMin, startMax, saveLabel, returnTo }: Props) {
  // bind() fixes the first argument (which trip), leaving the form state and data.
  const [result, action, pending] = useActionState<TripFormState, FormData>(saveTrip.bind(null, tripId), {
    errors: [],
    values: null,
  });
  const values = result.values ?? initial;
  // `key` starts the fields fresh with the typed values after an error.
  return (
    <TripFields
      key={JSON.stringify(values)}
      {...{ values, startMin, startMax, saveLabel, returnTo, action, pending, errors: result.errors }}
    />
  );
}

/** The fields themselves. */
function TripFields({
  values,
  startMin,
  startMax,
  saveLabel,
  returnTo,
  action,
  pending,
  errors,
}: Omit<Props, "tripId" | "initial"> & {
  values: TripFormValues;
  action: (form: FormData) => void;
  pending: boolean;
  errors: string[];
}) {
  // Kept here, so the city search knows which states are ticked.
  const [states, setStates] = useState(values.states);
  const [cities, setCities] = useState(values.cities);

  return (
    <form action={action} className="flex flex-col gap-4">
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      {errors.length > 0 && (
        <ul role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Trip name</Label>
        <Input id="name" name="name" defaultValue={values.name} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            min={startMin}
            max={startMax ?? undefined}
            defaultValue={values.startDate}
            required
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="end_date">End date</Label>
          <Input id="end_date" name="end_date" type="date" defaultValue={values.endDate} required />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          States <span className="font-normal text-muted-foreground">(choose one or more)</span>
        </legend>
        <div role="group" aria-label="States" className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {STATES.map(([code, name]) => (
            <label key={code} className="flex min-h-8 items-center gap-2 text-sm pointer-coarse:min-h-11">
              <Checkbox
                name="states"
                value={code}
                checked={states.includes(code)}
                onCheckedChange={(checked) =>
                  setStates((before) => (checked ? [...before, code] : before.filter((other) => other !== code)))
                }
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          Cities <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        <TripCityPicker states={states} cities={cities} onCitiesChange={setCities} />
      </fieldset>

      <FormActions cancelHref={returnTo === "years" ? "/years" : "/trips"} saveLabel={saveLabel} pending={pending} />
    </form>
  );
}
