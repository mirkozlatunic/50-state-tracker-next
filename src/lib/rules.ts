// The rules a visit or a trip must follow. These functions only check input
// and return error messages; they don't save anything, so they're easy to test.
// `today` is passed in ("YYYY-MM-DD") instead of looked up, so tests can pick the day.

import { findCity } from "@/lib/cities";
import { parseDate, shiftToYear, yearOf } from "@/lib/dates";
import { STATE_CODES, STATE_NAMES } from "@/lib/data/states";

export type VisitInput = { state: string; visitDate: string; city?: string };

export type TripInput = {
  name: string;
  startDate: string;
  endDate: string;
  states: readonly string[];
  /** When editing: the trip's current start date, which may be kept even if it has passed. */
  keepStart?: string;
};

export type TripCity = { name: string; state: string };

/** Check a visit (new or edited). Returns error messages; an empty list means OK. */
export function validateVisit({ state, visitDate, city = "" }: VisitInput, today: string): string[] {
  const errors: string[] = [];

  if (!STATE_CODES.has(state)) errors.push("Please choose one of the 50 states.");

  if (!visitDate) {
    errors.push("Please enter a visit date.");
  } else if (parseDate(visitDate) === null) {
    errors.push("Please enter a real date.");
  } else if (visitDate > today) {
    errors.push("The visit date can't be in the future.");
  }

  const cityName = city.trim();
  if (cityName && STATE_CODES.has(state) && findCity(cityName, state) === null) {
    errors.push(`We couldn't find “${cityName}” in ${STATE_NAMES[state]}.`);
  }
  return errors;
}

/** Check a planned trip (new or edited). Returns error messages; an empty list means OK. */
export function validateTrip({ name, startDate, endDate, states, keepStart }: TripInput, today: string): string[] {
  const errors: string[] = [];

  if (!name.trim()) errors.push("Please enter a trip name.");

  const start = startDate ? parseDate(startDate) : null;
  if (!startDate) {
    errors.push("Please enter a start date.");
  } else if (start === null) {
    errors.push("Please enter a real start date.");
  } else if (start <= today && start !== keepStart) {
    errors.push("A planned trip must start in the future.");
  }

  const end = endDate ? parseDate(endDate) : null;
  if (!endDate) {
    errors.push("Please enter an end date.");
  } else if (end === null) {
    errors.push("Please enter a real end date.");
  }

  // Only compare the dates when both are real dates.
  if (start && end && end < start) errors.push("The end date can't be before the start date.");

  if (states.length === 0) {
    errors.push("Please choose at least one state.");
  } else if (states.some((code) => !STATE_CODES.has(code))) {
    errors.push("Please choose only from the 50 states.");
  }
  return errors;
}

/** Check a trip's city rows, e.g. ["Denver, CO", "Santa Fe, NM", ""].
 * Returns the errors, and the cities with their official spelling. Empty rows
 * are skipped and a city written twice counts once. */
export function validateTripCities(lines: readonly string[], states: readonly string[]) {
  const errors: string[] = [];
  const cities: TripCity[] = [];

  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;
    // Split at the last comma: "Winston-Salem, NC" -> "Winston-Salem" and "NC".
    const comma = text.lastIndexOf(",");
    const name = comma === -1 ? "" : text.slice(0, comma).trim();
    const code = comma === -1 ? "" : text.slice(comma + 1).trim().toUpperCase();

    let message: string;
    const city = name && STATE_CODES.has(code) ? findCity(name, code) : null;
    if (!name || !STATE_CODES.has(code)) {
      message = "Please write each city as “City, ST”, for example “Denver, CO”.";
    } else if (city === null) {
      message = `We couldn't find “${name}, ${code}”.`;
    } else if (!states.includes(code)) {
      message = `${city.name}, ${city.state} isn't in this trip's states.`;
    } else {
      if (!cities.some((c) => c.name === city.name && c.state === city.state)) {
        cities.push({ name: city.name, state: city.state });
      }
      continue;
    }
    if (!errors.includes(message)) errors.push(message);
  }
  return { errors, cities };
}

export type MovePlan =
  | { kind: "same" }
  | { kind: "error"; message: string }
  | { kind: "move"; startDate: string; endDate: string };

/** Work out moving a trip to another year (from the "Move to" menu or a drag).
 * `year` is the text the form sent. The moved trip must follow the trip rules. */
export function planMove(
  trip: { name: string; startDate: string; endDate: string; states: readonly string[] },
  year: string,
  today: string,
): MovePlan {
  const thisYear = yearOf(today);
  const target = /^\d{4}$/.test(year) ? Number(year) : NaN;
  if (!(target >= thisYear && target <= thisYear + 100)) {
    return { kind: "error", message: "Please choose a year from this year on." };
  }
  if (target === yearOf(trip.startDate)) return { kind: "same" };

  const moved = shiftToYear(trip.startDate, trip.endDate, target);
  const errors = validateTrip({ name: trip.name, states: trip.states, ...moved }, today);
  return errors.length ? { kind: "error", message: errors[0] } : { kind: "move", ...moved };
}
