// Reading and writing the database for the pages. Each function takes the
// database, so tests can pass a temporary one. Values are checked by the rules
// (src/lib/rules.ts) before they get here.
// Since slice 13 each function also takes `userId`, the signed-in person's
// Clerk id: it only reads and changes that person's visits and trips.
// Someone else's visit or trip acts exactly like one that doesn't exist.

import { and, asc, countDistinct, desc, eq, exists, inArray, sql } from "drizzle-orm";
import type { Trip, Visit } from "@/lib/progress";
import { PHOTO_MAX_PER_MONTH, PHOTO_MAX_PER_VISIT } from "@/lib/photos";
import { isShareId, newShareId } from "@/lib/share";
import type { TripCity } from "@/lib/rules";
import type { Database } from "./index";
import { photoUploads, states, tripCities, trips, tripStates, userSettings, visitPhotos, visits } from "./schema";

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

// ---- A visit's photos (slice 18). The files are in the photo store; these
// rows say where, and whose. Every function only touches my photos.

export type PhotoValues = { fullPath: string; thumbPath: string; width: number; height: number };
export type SavedPhoto = PhotoValues & { id: number; visitId: number };

const photoColumns = {
  id: visitPhotos.id,
  visitId: visitPhotos.visitId,
  fullPath: visitPhotos.fullPath,
  thumbPath: visitPhotos.thumbPath,
  width: visitPhotos.width,
  height: visitPhotos.height,
};

/** Add a photo to one of my visits. Its id; "full" if the visit already has
 * the most photos it can; null if I have no visit with that id. */
export async function addPhoto(db: Database, userId: string, visitId: number, photo: PhotoValues): Promise<number | "full" | null> {
  if (!(await getVisit(db, userId, visitId))) return null;
  if ((await photosForVisit(db, userId, visitId)).length >= PHOTO_MAX_PER_VISIT) return "full";
  const [row] = await db.insert(visitPhotos).values({ visitId, userId, ...photo }).returning({ id: visitPhotos.id });
  return row.id;
}

/** My photos of one visit, oldest first. */
export async function photosForVisit(db: Database, userId: string, visitId: number): Promise<SavedPhoto[]> {
  return db
    .select(photoColumns)
    .from(visitPhotos)
    .where(and(eq(visitPhotos.visitId, visitId), eq(visitPhotos.userId, userId)))
    .orderBy(asc(visitPhotos.id));
}

/** One of my photos, or null. */
export async function getPhoto(db: Database, userId: string, id: number): Promise<SavedPhoto | null> {
  const [row] = await db
    .select(photoColumns)
    .from(visitPhotos)
    .where(and(eq(visitPhotos.id, id), eq(visitPhotos.userId, userId)));
  return row ?? null;
}

/** Delete one of my photos. Its two files, to remove from the photo store; null if I had no such photo. */
export async function deletePhoto(db: Database, userId: string, id: number): Promise<string[] | null> {
  const photo = await getPhoto(db, userId, id);
  if (!photo) return null;
  await db.delete(visitPhotos).where(and(eq(visitPhotos.id, id), eq(visitPhotos.userId, userId)));
  return [photo.fullPath, photo.thumbPath];
}

/** The files of all my photos of one visit (to remove from the store when the visit is deleted). */
export async function photoPathsForVisit(db: Database, userId: string, visitId: number): Promise<string[]> {
  return (await photosForVisit(db, userId, visitId)).flatMap((photo) => [photo.fullPath, photo.thumbPath]);
}

/** How many photos each of these visits of mine has (visits without photos are left out). */
export async function photoCounts(db: Database, userId: string, visitIds: number[]): Promise<Map<number, number>> {
  if (visitIds.length === 0) return new Map();
  const rows = await db
    .select({ visitId: visitPhotos.visitId, count: sql<number>`count(*)` })
    .from(visitPhotos)
    .where(and(inArray(visitPhotos.visitId, visitIds), eq(visitPhotos.userId, userId)))
    .groupBy(visitPhotos.visitId);
  return new Map(rows.map((row) => [row.visitId, Number(row.count)]));
}

// ---- Deleting an account (slice 24).

/** Delete everything of mine in the database: visits, trips (with their states
 * and cities), photo rows, settings (with the share link) and upload counts.
 * One "batch" in "write" mode runs as a transaction: all of it, or none of it.
 * The photo files are deleted separately (deleteAccount in account-deletion.ts).
 * An empty id is refused: rows with no owner are nobody's to delete. */
export async function deleteUserData(db: Database, userId: string): Promise<void> {
  if (!userId) throw new Error("No user id given");
  const myTrips = "trip_id IN (SELECT id FROM trips WHERE user_id = ?)";
  await db.$client.batch(
    [
      // The rows that point at a trip or a visit go before the trip or visit itself.
      `DELETE FROM trip_cities WHERE ${myTrips}`,
      `DELETE FROM trip_states WHERE ${myTrips}`,
      "DELETE FROM trips WHERE user_id = ?",
      "DELETE FROM visit_photos WHERE user_id = ?",
      "DELETE FROM visits WHERE user_id = ?",
      "DELETE FROM user_settings WHERE user_id = ?",
      "DELETE FROM photo_uploads WHERE user_id = ?",
    ].map((sql) => ({ sql, args: [userId] })),
    "write",
  );
}

// ---- My photo uploads per month (slice 23), for the monthly limit.

/** How many photos I've uploaded in `month` ("YYYY-MM"). */
export async function photoUploadsIn(db: Database, userId: string, month: string): Promise<number> {
  const [row] = await db
    .select({ count: photoUploads.count })
    .from(photoUploads)
    .where(and(eq(photoUploads.userId, userId), eq(photoUploads.month, month)));
  return row?.count ?? 0;
}

/** Count one more upload of mine in `month`. "Upsert": add my row for the
 * month, or add 1 to it if it's there. */
export async function countPhotoUpload(db: Database, userId: string, month: string): Promise<void> {
  await db
    .insert(photoUploads)
    .values({ userId, month, count: 1 })
    .onConflictDoUpdate({ target: [photoUploads.userId, photoUploads.month], set: { count: sql`${photoUploads.count} + 1` } });
}

/** True while I'm under the monthly limit in `month`. */
export async function canUploadPhoto(db: Database, userId: string, month: string): Promise<boolean> {
  return (await photoUploadsIn(db, userId, month)) < PHOTO_MAX_PER_MONTH;
}

// ---- My settings (slice 19): one row per person, made the first time it's needed.

/** The highest milestone I've already celebrated (0 = none yet). */
export async function celebratedMilestone(db: Database, userId: string): Promise<number> {
  const [row] = await db.select({ celebrated: userSettings.celebrated }).from(userSettings).where(eq(userSettings.userId, userId));
  return row?.celebrated ?? 0;
}

/** Remember that I've celebrated `milestone`. "Upsert": add my row, or update it if it's there. */
export async function setCelebratedMilestone(db: Database, userId: string, milestone: number): Promise<void> {
  await db
    .insert(userSettings)
    .values({ userId, celebrated: milestone })
    .onConflictDoUpdate({ target: userSettings.userId, set: { celebrated: milestone } });
}

// ---- Sharing my map (slice 20). Off until I turn it on; the link /share/<code>
// shows only which states I've visited.

/** My share code, or null when my map isn't shared. */
export async function shareId(db: Database, userId: string): Promise<string | null> {
  const [row] = await db.select({ shareId: userSettings.shareId }).from(userSettings).where(eq(userSettings.userId, userId));
  return row?.shareId ?? null;
}

/** Share my map with a new code (replacing an old one, whose link stops working). Returns the code. */
export async function startSharing(db: Database, userId: string): Promise<string> {
  const code = newShareId();
  await db
    .insert(userSettings)
    .values({ userId, shareId: code })
    .onConflictDoUpdate({ target: userSettings.userId, set: { shareId: code } });
  return code;
}

/** Stop sharing my map: its link stops working. */
export async function stopSharing(db: Database, userId: string): Promise<void> {
  await db.update(userSettings).set({ shareId: null }).where(eq(userSettings.userId, userId));
}

/** What a shared link shows: the states its owner has visited (each once, A to Z),
 * and nothing else. null for a code that's unknown or no longer shared. */
export async function sharedProgress(db: Database, code: string): Promise<{ visitedStates: string[] } | null> {
  if (!isShareId(code)) return null;
  const [owner] = await db.select({ userId: userSettings.userId }).from(userSettings).where(eq(userSettings.shareId, code));
  if (!owner) return null;
  const rows = await db
    .selectDistinct({ code: states.code })
    .from(visits)
    .innerJoin(states, eq(states.id, visits.stateId))
    .where(eq(visits.userId, owner.userId))
    .orderBy(asc(states.code));
  return { visitedStates: rows.map((row) => row.code) };
}
