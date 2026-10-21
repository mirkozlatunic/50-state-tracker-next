// Reading the visit form (add and edit share it) and getting its values ready
// to save. zod describes what the form sends; the rules decide what's allowed.

import { z } from "zod";
import { findCity } from "@/lib/cities";
import { validateVisit } from "@/lib/rules";
import type { VisitValues } from "@/db/queries";

/** What the form fields hold: text, or nothing if a field wasn't sent. */
const visitFormSchema = z.object({
  state: z.string().catch(""),
  visit_date: z.string().catch(""),
  city: z.string().catch(""),
  note: z.string().catch(""),
});

/** What was typed, in the shape the form shows it again after an error. */
export type VisitFormValues = { state: string; visitDate: string; city: string; note: string };

export type VisitFormResult =
  | { ok: true; visit: VisitValues }
  | { ok: false; errors: string[]; values: VisitFormValues };

/** Check a submitted visit form against the rules. OK: the values to save
 * (official city spelling, trimmed note). Not OK: the errors and what was typed. */
export function checkVisitForm(form: FormData, today: string): VisitFormResult {
  // Object.fromEntries turns the form into { state: "CO", ... }; missing fields become "".
  const fields = visitFormSchema.parse(Object.fromEntries(form));
  const values = { state: fields.state, visitDate: fields.visit_date, city: fields.city.trim(), note: fields.note.trim() };

  const errors = validateVisit(values, today);
  if (errors.length) return { ok: false, errors, values: { ...values, city: fields.city, note: fields.note } };

  const city = values.city ? findCity(values.city, values.state)!.name : null;
  return { ok: true, visit: { state: values.state, visitDate: values.visitDate, note: values.note, city } };
}
