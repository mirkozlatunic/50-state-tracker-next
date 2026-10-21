// Reading and writing the database for the pages. Each function takes the
// database, so tests can pass a temporary one. Values are checked by the rules
// (src/lib/rules.ts) before they get here.

import { asc, countDistinct, desc, eq, exists, inArray, sql } from "drizzle-orm";
import type { Trip, Visit } from "@/lib/progress";
import type { TripCity } from "@/lib/rules";
import type { Database } from "./index";
import { states, tripCities, trips, tripStates, visits } from "./schema";

/** How many different states have at least one visit (the "X of 50" counter). */
export async function visitedStateCount(db: Database): Promise<number> {
  const [row] = await db.select({ count: countDistinct(visits.stateId) }).from(visits);
  return row.count;
}

/** All 50 states A to Z, each marked visited if it has at least one visit. */
export async function listStates(db: Database) {
  const rows = await db
    .select({
      code: states.code,
      name: states.name,
      // EXISTS is a yes/no check: is there at least one visit for this state?
      visited: exists(db.select({ one: sql`1` }).from(visits).where(eq(visits.stateId, states.id))),
    })
    .from(states)
    .orderBy(asc(states.name));
  // SQLite answers yes/no as 1/0; turn that into true/false.
  return rows.map((row) => ({ ...row, visited: Boolean(row.visited) }));
}

/** One state by its code (any upper/lower case), or null if there's no such state. */
export async function getState(db: Database, code: string) {
  const [row] = await db.select().from(states).where(eq(states.code, code.toUpperCase()));
  return row ?? null;
}

/** The id of a state, by its code. Only called with codes the rules accepted. */
async function stateId(db: Database, code: string): Promise<number> {
  const state = await getState(db, code);
  if (!state) throw new Error(`Unknown state: ${code}`);
  return state.id;
}

export type VisitValues = { state: string; visitDate: string; note: string; city: string | null };
export type SavedVisit = VisitValues & { id: number };

/** One state's visits, newest first; on the same day, the one added later first. */
export async function visitsForState(db: Database, code: string): Promise<SavedVisit[]> {
  return db
    .select({ id: visits.id, state: states.code, visitDate: visits.visitDate, note: visits.note, city: visits.city })
    .from(visits)
    .innerJoin(states, eq(states.id, visits.stateId))
    .where(eq(states.code, code.toUpperCase()))
    .orderBy(desc(visits.visitDate), desc(visits.id));
}

/** Save a new visit and return its id. */
export async function addVisit(db: Database, visit: VisitValues): Promise<number> {
  const [row] = await db
    .insert(visits)
    .values({ stateId: await stateId(db, visit.state), visitDate: visit.visitDate, note: visit.note, city: visit.city })
    .returning({ id: visits.id });
  return row.id;
}

/** One visit, or null if there's no visit with that id. */
export async function getVisit(db: Database, id: number): Promise<SavedVisit | null> {
  const [row] = await db
    .select({ id: visits.id, state: states.code, visitDate: visits.visitDate, note: visits.note, city: visits.city })
    .from(visits)
    .innerJoin(states, eq(states.id, visits.stateId))
    .where(eq(visits.id, id));
  return row ?? null;
}

/** Change a visit: state, date, note and city. */
export async function updateVisit(db: Database, id: number, visit: VisitValues): Promise<void> {
  await db
    .update(visits)
    .set({ stateId: await stateId(db, visit.state), visitDate: visit.visitDate, note: visit.note, city: visit.city })
    .where(eq(visits.id, id));
}

/** Delete a visit. Returns the code of the state it was in, or null if there was no such visit. */
export async function deleteVisit(db: Database, id: number): Promise<string | null> {
  const visit = await getVisit(db, id);
  if (!visit) return null;
  await db.delete(visits).where(eq(visits.id, id));
  return visit.state;
}

/** Every visit, for the map, the years page and the region cards. */
export async function loadVisits(db: Database): Promise<Visit[]> {
  return db
    .select({ state: states.code, visitDate: visits.visitDate, city: visits.city })
    .from(visits)
    .innerJoin(states, eq(states.id, visits.stateId));
}

/** Every trip with its states and cities (which trips to show is up to src/lib/progress.ts). */
export async function loadTrips(db: Database): Promise<Trip[]> {
  const tripRows = await db.select().from(trips).orderBy(asc(trips.startDate), asc(trips.id));
  const stateRows = await db
    .select({ tripId: tripStates.tripId, code: states.code })
    .from(tripStates)
    .innerJoin(states, eq(states.id, tripStates.stateId));
  const cityRows = await db
    .select({ tripId: tripCities.tripId, name: tripCities.city, state: states.code })
    .from(tripCities)
    .innerJoin(states, eq(states.id, tripCities.stateId))
    .orderBy(asc(tripCities.city));
  return tripRows.map((trip) => ({
    ...trip,
    states: stateRows.filter((row) => row.tripId === trip.id).map((row) => row.code),
    cities: cityRows.filter((row) => row.tripId === trip.id).map(({ name, state }) => ({ name, state })),
  }));
}

export type TripValues = { name: string; startDate: string; endDate: string; states: string[]; cities: TripCity[] };

/** The database or a transaction inside it: both can run the same queries. */
type Writer = Parameters<Parameters<Database["transaction"]>[0]>[0] | Database;

/** Link a trip to its states and cities (each state once). */
async function saveTripPlaces(db: Writer, tripId: number, trip: TripValues) {
  const codes = [...new Set([...trip.states, ...trip.cities.map((city) => city.state)])];
  const rows = await db.select({ id: states.id, code: states.code }).from(states).where(inArray(states.code, codes));
  const idOf = new Map(rows.map((row) => [row.code, row.id]));
  const tripStateCodes = [...new Set(trip.states)];
  if (tripStateCodes.length) {
    await db.insert(tripStates).values(tripStateCodes.map((code) => ({ tripId, stateId: idOf.get(code)! })));
  }
  if (trip.cities.length) {
    await db.insert(tripCities).values(trip.cities.map((city) => ({ tripId, stateId: idOf.get(city.state)!, city: city.name })));
  }
}

/** Save a new trip with its states and cities; returns its id. A "transaction"
 * saves all of it or nothing, so a trip is never left half-saved. */
export async function addTrip(db: Database, trip: TripValues): Promise<number> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(trips)
      .values({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate })
      .returning({ id: trips.id });
    await saveTripPlaces(tx, row.id, trip);
    return row.id;
  });
}

/** One trip with its states and cities, or null if there's no trip with that id. */
export async function getTrip(db: Database, id: number): Promise<Trip | null> {
  return (await loadTrips(db)).find((trip) => trip.id === id) ?? null;
}

/** Change a trip: its name and dates, and replace its states and cities. */
export async function updateTrip(db: Database, id: number, trip: TripValues): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(trips).set({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate }).where(eq(trips.id, id));
    await tx.delete(tripStates).where(eq(tripStates.tripId, id));
    await tx.delete(tripCities).where(eq(tripCities.tripId, id));
    await saveTripPlaces(tx, id, trip);
  });
}

/** Change only a trip's dates (moving it to another year). */
export async function setTripDates(db: Database, id: number, startDate: string, endDate: string): Promise<void> {
  await db.update(trips).set({ startDate, endDate }).where(eq(trips.id, id));
}

/** Delete a trip; its states and cities go with it (ON DELETE CASCADE). False if there was no such trip. */
export async function deleteTrip(db: Database, id: number): Promise<boolean> {
  const deleted = await db.delete(trips).where(eq(trips.id, id)).returning({ id: trips.id });
  return deleted.length > 0;
}
