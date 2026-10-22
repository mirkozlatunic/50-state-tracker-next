// Reading the trip form (plan and edit share it), the limits of its start date
// picker, and where to go afterwards. zod describes what the form sends; the
// rules decide what's allowed.

import { z } from "zod";
import type { TripValues } from "@/db/queries";
import { daysBetween, yearOf } from "@/lib/dates";
import { validateTrip, validateTripCities } from "@/lib/rules";

/** What the form sends: text fields, and lists for the ticked states and chosen cities. */
const tripFormSchema = z.object({
  name: z.string().catch(""),
  start_date: z.string().catch(""),
  end_date: z.string().catch(""),
  states: z.array(z.string()).catch([]),
  cities: z.array(z.string()).catch([]),
});

/** What was typed, in the shape the form shows it again after an error. */
export type TripFormValues = { name: string; startDate: string; endDate: string; states: string[]; cities: string[] };

export type TripFormResult = { ok: true; trip: TripValues } | { ok: false; errors: string[]; values: TripFormValues };

/** Check a submitted trip form against the rules. When editing, `keepStart` is
 * the trip's current start date, which may be kept even if it has passed. */
export function checkTripForm(form: FormData, today: string, keepStart?: string): TripFormResult {
  const fields = tripFormSchema.parse({
    name: form.get("name"),
    start_date: form.get("start_date"),
    end_date: form.get("end_date"),
    // getAll() gives every ticked checkbox and every city, e.g. ["AZ", "UT"].
    states: form.getAll("states"),
    cities: form.getAll("cities"),
  });
  const states = [...new Set(fields.states)];
  const values = { name: fields.name, startDate: fields.start_date, endDate: fields.end_date, states, cities: fields.cities };

  const tripErrors = validateTrip({ ...values, keepStart }, today);
  const { errors: cityErrors, cities } = validateTripCities(values.cities, states);
  const errors = [...tripErrors, ...cityErrors];
  if (errors.length) return { ok: false, errors, values };

  return { ok: true, trip: { name: values.name.trim(), startDate: values.startDate, endDate: values.endDate, states, cities } };
}

/** The day after `date`, as "YYYY-MM-DD". */
function nextDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/** The start date picker's earliest and latest day. Tomorrow at the earliest
 * (or a trip in progress's own start date); inside `year` when planning from
 * the years page. */
export function startDateLimits({ today, year, keepStart }: { today: string; year?: number | null; keepStart?: string }) {
  const tomorrow = nextDay(today);
  let min = keepStart && daysBetween(keepStart, tomorrow) > 0 ? keepStart : tomorrow;
  let max: string | null = null;
  if (year) {
    const firstDay = `${year}-01-01`;
    if (firstDay > min) min = firstDay;
    max = `${year}-12-31`;
  }
  return { min, max };
}

/** The ?year= from the address: a year from this year up to 9999, or null. */
export function readYear(text: string | undefined | null, today: string): number | null {
  if (!text || !/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  return year >= yearOf(today) ? year : null;
}

/** Where to go after saving or deleting: the years page if you came from it,
 * otherwise the trips page. Only these two, so a link can't send you elsewhere. */
export function returnPath(returnTo: string | null | undefined): "/years" | "/trips" {
  return returnTo === "years" ? "/years" : "/trips";
}

