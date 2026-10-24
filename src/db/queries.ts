// Reading and writing the database for the pages. Each function takes the
// database, so tests can pass a temporary one. Values are checked by the rules
// (src/lib/rules.ts) before they get here.
// Since slice 13 each function also takes `userId`, the signed-in person's
// Clerk id: it only reads and changes that person's visits and trips.
// Someone else's visit or trip acts exactly like one that doesn't exist.

import { and, asc, countDistinct, desc, eq, exists, inArray, sql } from "drizzle-orm";
import type { Trip, Visit } from "@/lib/progress";
import type { TripCity } from "@/lib/rules";
import type { Database } from "./index";
import { states, tripCities, trips, tripStates, visits } from "./schema";

/** How many different states have at least one of my visits (the "X of 50" counter). */
export async function visitedStateCount(db: Database, userId: string): Promise<number> {
  const [row] = await db.select({ count: countDistinct(visits.stateId) }).from(visits).where(eq(visits.userId, userId));
  return row.count;
}

/** All 50 states A to Z, each marked visited if it has at least one of my visits. */
export async function listStates(db: Database, userId: string) {
  const rows = await db
    .select({
      code: states.code,
      name: states.name,
      // EXISTS is a yes/no check: is there at least one visit of mine for this state?
      visited: exists(
        db
          .select({ one: sql`1` })
          .from(visits)
          .where(and(eq(visits.stateId, states.id), eq(visits.userId, userId))),
      ),
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
export type SavedVisit = VisitValues & { id: number; story: string };

/** My visits to one state, newest first; on the same day, the one added later first. */
export async function visitsForState(db: Database, userId: string, code: string): Promise<SavedVisit[]> {
  return db
    .select({ id: visits.id, state: states.code, visitDate: visits.visitDate, note: visits.note, city: visits.city, story: visits.story })
    .from(visits)
    .innerJoin(states, eq(states.id, visits.stateId))
    .where(and(eq(states.code, code.toUpperCase()), eq(visits.userId, userId)))
    .orderBy(desc(visits.visitDate), desc(visits.id));
}

/** Save a new visit of mine and return its id. */
export async function addVisit(db: Database, userId: string, visit: VisitValues): Promise<number> {
  const [row] = await db
    .insert(visits)
    .values({ stateId: await stateId(db, visit.state), visitDate: visit.visitDate, note: visit.note, city: visit.city, userId })
    .returning({ id: visits.id });
  return row.id;
}

/** One of my visits, or null if I have no visit with that id. */
export async function getVisit(db: Database, userId: string, id: number): Promise<SavedVisit | null> {
  const [row] = await db
    .select({ id: visits.id, state: states.code, visitDate: visits.visitDate, note: visits.note, city: visits.city, story: visits.story })
    .from(visits)
    .innerJoin(states, eq(states.id, visits.stateId))
    .where(and(eq(visits.id, id), eq(visits.userId, userId)));
  return row ?? null;
}

/** Change one of my visits: state, date, note and city. False if I have no visit with that id. */
export async function updateVisit(db: Database, userId: string, id: number, visit: VisitValues): Promise<boolean> {
  const changed = await db
    .update(visits)
    .set({ stateId: await stateId(db, visit.state), visitDate: visit.visitDate, note: visit.note, city: visit.city })
    .where(and(eq(visits.id, id), eq(visits.userId, userId)))
    .returning({ id: visits.id });
  return changed.length > 0;
}

/** Save (or clear, with "") the story of one of my visits. False if I have no visit with that id. */
export async function setVisitStory(db: Database, userId: string, id: number, story: string): Promise<boolean> {
  const changed = await db
    .update(visits)
    .set({ story })
    .where(and(eq(visits.id, id), eq(visits.userId, userId)))
    .returning({ id: visits.id });
  return changed.length > 0;
}

/** Delete one of my visits. Returns the code of the state it was in, or null if I had no such visit. */
export async function deleteVisit(db: Database, userId: string, id: number): Promise<string | null> {
  const visit = await getVisit(db, userId, id);
  if (!visit) return null;
  await db.delete(visits).where(and(eq(visits.id, id), eq(visits.userId, userId)));
  return visit.state;
}

/** All my visits, for the map, the years page and the region cards. */
export async function loadVisits(db: Database, userId: string): Promise<Visit[]> {
  return db
    .select({ state: states.code, visitDate: visits.visitDate, city: visits.city })
    .from(visits)
    .innerJoin(states, eq(states.id, visits.stateId))
    .where(eq(visits.userId, userId));
}

/** All my trips with their states and cities (which trips to show is up to src/lib/progress.ts). */
export async function loadTrips(db: Database, userId: string): Promise<Trip[]> {
  const tripRows = await db
    .select({ id: trips.id, name: trips.name, startDate: trips.startDate, endDate: trips.endDate })
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(asc(trips.startDate), asc(trips.id));
  // The states and cities of my trips only (joined to trips to see whose they are).
  const stateRows = await db
    .select({ tripId: tripStates.tripId, code: states.code })
    .from(tripStates)
    .innerJoin(states, eq(states.id, tripStates.stateId))
    .innerJoin(trips, eq(trips.id, tripStates.tripId))
    .where(eq(trips.userId, userId));
  const cityRows = await db
    .select({ tripId: tripCities.tripId, name: tripCities.city, state: states.code })
    .from(tripCities)
    .innerJoin(states, eq(states.id, tripCities.stateId))
    .innerJoin(trips, eq(trips.id, tripCities.tripId))
    .where(eq(trips.userId, userId))
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

/** Save a new trip of mine with its states and cities; returns its id. A "transaction"
 * saves all of it or nothing, so a trip is never left half-saved. */
export async function addTrip(db: Database, userId: string, trip: TripValues): Promise<number> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(trips)
      .values({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate, userId })
      .returning({ id: trips.id });
    await saveTripPlaces(tx, row.id, trip);
    return row.id;
  });
}

/** One of my trips with its states and cities, or null if I have no trip with that id. */
export async function getTrip(db: Database, userId: string, id: number): Promise<Trip | null> {
  return (await loadTrips(db, userId)).find((trip) => trip.id === id) ?? null;
}

/** Change one of my trips: its name and dates, and replace its states and cities.
 * False (and nothing changed) if I have no trip with that id. */
export async function updateTrip(db: Database, userId: string, id: number, trip: TripValues): Promise<boolean> {
  return db.transaction(async (tx) => {
    const changed = await tx
      .update(trips)
      .set({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate })
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .returning({ id: trips.id });
    if (changed.length === 0) return false; // not mine: leave its states and cities alone too
    await tx.delete(tripStates).where(eq(tripStates.tripId, id));
    await tx.delete(tripCities).where(eq(tripCities.tripId, id));
    await saveTripPlaces(tx, id, trip);
    return true;
  });
}

/** Change only one of my trips' dates (moving it to another year). False if I have no such trip. */
export async function setTripDates(db: Database, userId: string, id: number, startDate: string, endDate: string): Promise<boolean> {
  const changed = await db
    .update(trips)
    .set({ startDate, endDate })
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning({ id: trips.id });
  return changed.length > 0;
}

/** Delete one of my trips; its states and cities go with it (ON DELETE CASCADE). False if I had no such trip. */
export async function deleteTrip(db: Database, userId: string, id: number): Promise<boolean> {
  const deleted = await db
    .delete(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning({ id: trips.id });
  return deleted.length > 0;
}
