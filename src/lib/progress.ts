// What the pages show, worked out from plain lists of visits and trips:
// the progress count, map colors, the year plan, city dots, region cards and
// the next trip. The pages load the data and pass it in, so none of this
// needs the database (and the tests can use made-up lists).

import { findCity } from "@/lib/cities";
import { daysBetween, yearOf } from "@/lib/dates";
import { REGIONS } from "@/lib/data/regions";
import { STATES, STATE_NAMES } from "@/lib/data/states";
import type { TripCity } from "@/lib/rules";

export type Visit = { state: string; visitDate: string; city: string | null };

export type Trip = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  states: string[];
  cities: TripCity[];
};

export type TrackerData = { visits: readonly Visit[]; trips: readonly Trip[] };

export type StateStatus = "visited" | "planned" | "unvisited";

/** How many different states have at least one visit ("12 of 50"). */
export function countVisitedStates(visits: readonly Visit[]): number {
  return new Set(visits.map((visit) => visit.state)).size;
}

/** Trips that haven't ended yet (one ending today still counts), soonest first. */
export function upcomingTrips(trips: readonly Trip[], today: string): Trip[] {
  return trips
    .filter((trip) => trip.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id);
}

/** The years that upcoming trips start in, earliest first, e.g. [2026, 2027]. */
export function tripYears(trips: readonly Trip[], today: string): number[] {
  return [...new Set(upcomingTrips(trips, today).map((trip) => yearOf(trip.startDate)))].sort((a, b) => a - b);
}

/** Upcoming trips, limited to the ones starting in `year` when a year is given. */
function tripsFor(trips: readonly Trip[], today: string, year?: number): Trip[] {
  return upcomingTrips(trips, today).filter((trip) => year === undefined || yearOf(trip.startDate) === year);
}

/** Each state's map color. Visited (any visit) wins over planned (in a trip
 * that hasn't ended). With `year`, only trips starting that year count. */
export function stateStatuses({ visits, trips }: TrackerData, today: string, year?: number) {
  const visited = new Set(visits.map((visit) => visit.state));
  const planned = new Set(tripsFor(trips, today, year).flatMap((trip) => trip.states));
  const statuses: Record<string, StateStatus> = {};
  for (const [code] of STATES) {
    statuses[code] = visited.has(code) ? "visited" : planned.has(code) ? "planned" : "unvisited";
  }
  return statuses;
}

export type YearPlan = { year: number; trips: Trip[]; newStates: string[]; totalByEnd: number };

/** One entry per year for the year page, from this year on.
 * - Years run to the year of the last planned trip, and always include this
 *   year and the next two.
 * - A trip belongs to the year it starts in; one still going that started
 *   last year shows in this year.
 * - newStates: states in that year's trips you haven't visited or planned in an
 *   earlier year, A to Z by name. totalByEnd: visited plus planned so far. */
export function yearPlan({ visits, trips }: TrackerData, today: string): YearPlan[] {
  const thisYear = yearOf(today);
  const upcoming = upcomingTrips(trips, today);
  const yearFor = (trip: Trip) => Math.max(yearOf(trip.startDate), thisYear);
  const lastYear = Math.max(thisYear + 2, ...upcoming.map(yearFor));

  const counted = new Set(visits.map((visit) => visit.state));
  const plan: YearPlan[] = [];
  for (let year = thisYear; year <= lastYear; year++) {
    const yearTrips = upcoming.filter((trip) => yearFor(trip) === year);
    const newCodes = new Set(yearTrips.flatMap((trip) => trip.states).filter((code) => !counted.has(code)));
    newCodes.forEach((code) => counted.add(code));
    plan.push({
      year,
      trips: yearTrips,
      newStates: [...newCodes].map((code) => STATE_NAMES[code]).sort(),
      totalByEnd: counted.size,
    });
  }
  return plan;
}

export type CityDot = {
  name: string;
  state: string;
  x: number;
  y: number;
  kind: "visited" | "upcoming";
  visitDates: string[];
  trips: { name: string; startDate: string }[];
  /** A visited city's photo and the date of its visit (slice 27; see city-photos.ts). Only the map page adds it. */
  photo?: { id: number; visitDate: string; version: string };
};

/** One dot per city to draw on the map: every visited city, and every city in
 * a trip that hasn't ended (with `year`, only trips starting that year).
 * "upcoming" wins when both are true. Sorted by state, then name. */
export function cityDots({ visits, trips }: TrackerData, today: string, year?: number): CityDot[] {
  const found = new Map<string, { state: string; name: string; visitDates: string[]; trips: CityDot["trips"] }>();
  const infoFor = (state: string, name: string) => {
    const key = `${state}|${name}`;
    if (!found.has(key)) found.set(key, { state, name, visitDates: [], trips: [] });
    return found.get(key)!;
  };

  for (const visit of [...visits].sort((a, b) => a.visitDate.localeCompare(b.visitDate))) {
    if (visit.city) infoFor(visit.state, visit.city).visitDates.push(visit.visitDate);
  }
  for (const trip of tripsFor(trips, today, year)) {
    for (const city of trip.cities) infoFor(city.state, city.name).trips.push({ name: trip.name, startDate: trip.startDate });
  }

  const dots: CityDot[] = [];
  for (const info of found.values()) {
    const city = findCity(info.name, info.state);
    if (!city) continue; // not in the city list (e.g. the list was rebuilt without it)
    dots.push({
      name: city.name,
      state: info.state,
      x: city.x,
      y: city.y,
      kind: info.trips.length ? "upcoming" : "visited",
      visitDates: info.visitDates,
      trips: info.trips,
    });
  }
  return dots.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
}

export type RegionSummary = {
  name: string;
  total: number;
  visited: number;
  planned: number;
  visitedPercent: number;
  plannedPercent: number;
  states: { code: string; name: string; status: StateStatus; cityCount: number }[];
};

/** The four Census regions for the region cards. A state's status follows the
 * map's rules (year filter included); cityCount is how many different cities
 * you've visited there. */
export function regionSummaries(data: TrackerData, today: string, year?: number): RegionSummary[] {
  const statuses = stateStatuses(data, today, year);
  const cityCounts = new Map<string, number>();
  for (const dot of cityDots(data, today)) {
    if (dot.visitDates.length) cityCounts.set(dot.state, (cityCounts.get(dot.state) ?? 0) + 1);
  }
  /** A share of the region as a percentage with one decimal, e.g. 7.7. */
  const percent = (part: number, total: number) => Math.round((1000 * part) / total) / 10;

  return REGIONS.map(({ name, codes }) => {
    const states = codes
      .map((code) => ({ code, name: STATE_NAMES[code], status: statuses[code], cityCount: cityCounts.get(code) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const visited = states.filter((state) => state.status === "visited").length;
    const planned = states.filter((state) => state.status === "planned").length;
    return {
      name,
      total: codes.length,
      visited,
      planned,
      visitedPercent: percent(visited, codes.length),
      plannedPercent: percent(planned, codes.length),
      states,
    };
  });
}

/** The soonest trip that hasn't ended, with "happening now", "tomorrow" or
 * "in 10 days", or null when there's none. */
export function nextTrip(trips: readonly Trip[], today: string): { trip: Trip; when: string } | null {
  const [trip] = upcomingTrips(trips, today);
  if (!trip) return null;
  const days = daysBetween(today, trip.startDate);
  const when = days <= 0 ? "happening now" : days === 1 ? "tomorrow" : `in ${days} days`;
  return { trip, when };
}
