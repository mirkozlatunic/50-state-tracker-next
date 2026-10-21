// Dates are kept as "YYYY-MM-DD" text everywhere, like in the database.
// Text in that shape sorts in date order, so "2026-10-20" < "2026-11-01" works.

/** The time zone "today" is worked out in. The servers run on UTC, so without
 * this, a visit added on a California evening would already be "tomorrow". */
export const APP_TIME_ZONE = "America/Los_Angeles";

/** Return the date as written if it's a real "YYYY-MM-DD" date, otherwise null
 * (badly written, or a day that doesn't exist, like February 30th). */
export function parseDate(text: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  // Date.UTC rolls an impossible day over (Feb 30 -> Mar 2), so check it stayed put.
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? text : null;
}

/** Today's date in a time zone, as "YYYY-MM-DD". `now` is passed in so tests can pick the moment. */
export function todayIn(timeZone: string = APP_TIME_ZONE, now: Date = new Date()): string {
  // The "en-CA" locale happens to write dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Turn "YYYY-MM-DD" into a Date at midnight UTC (UTC, so no daylight saving surprises). */
function toUtc(text: string): Date {
  return new Date(`${text}T00:00:00Z`);
}

/** Turn a UTC Date back into "YYYY-MM-DD". */
function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** How many days from one date to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** The year of a "YYYY-MM-DD" date, as a number. */
export function yearOf(text: string): number {
  return Number(text.slice(0, 4));
}

/** A trip's dates moved to another year: the start keeps its month and day and
 * the trip keeps its length. Feb 29 becomes Feb 28 in a year without one. */
export function shiftToYear(startDate: string, endDate: string, year: number) {
  const length = daysBetween(startDate, endDate);
  let newStart = `${String(year).padStart(4, "0")}${startDate.slice(4)}`;
  if (parseDate(newStart) === null) newStart = `${year}-02-28`; // only Feb 29 can fail
  const newEnd = toUtc(newStart);
  newEnd.setUTCDate(newEnd.getUTCDate() + length);
  return { startDate: newStart, endDate: fromUtc(newEnd) };
}
