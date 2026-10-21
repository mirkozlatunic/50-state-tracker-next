"use client";
// The visit form, for adding and for editing. A client component, so the city
// search can follow the chosen state, and errors show without losing what was typed.

import { useActionState, useState } from "react";
import { saveVisit, type VisitFormState } from "@/app/(app)/visits/actions";
import { CityPicker } from "@/components/city-picker";
import { FormActions } from "@/components/form-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATES } from "@/lib/data/states";
import type { VisitFormValues } from "@/lib/visit-form";

// The menu's choices; Base UI uses them to show the chosen state's name.
const STATE_ITEMS = STATES.map(([code, name]) => ({ value: code, label: name }));

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
  // bind() fixes the first argument (which visit), leaving the form state and data.
  const [result, action, pending] = useActionState<VisitFormState, FormData>(saveVisit.bind(null, visitId), {
    errors: [],
    values: null,
  });
  const values = result.values ?? initial;
  // The state and city are kept here, so the city search knows the state.
  // `key` below starts the form fresh with the typed values after an error.
  return <FormFields key={JSON.stringify(values)} {...{ values, today, saveLabel, cancelHref, action, pending, errors: result.errors }} />;
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
}: {
  values: VisitFormValues;
  today: string;
  saveLabel: string;
  cancelHref: string;
  action: (form: FormData) => void;
  pending: boolean;
  errors: string[];
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

      <p className="text-sm text-muted-foreground">
        Only count a state if you spent time there outside the airport. Layovers don&apos;t count.
      </p>

      <FormActions cancelHref={cancelHref} saveLabel={saveLabel} pending={pending} />
    </form>
  );
}
