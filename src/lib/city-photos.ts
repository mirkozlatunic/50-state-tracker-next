// Which photo each visited city shows (slice 27). A city's photo is the first
// photo (oldest upload) of my most recent visit to that city that has photos.
// Only visits with a city count. The photo is shown as its 400 px preview,
// /photos/<id>?size=thumb, which only its owner can open.
// Slice 28: a planned trip's visited cities show the photo too, with
// "Visited <month year>".

import { photoVersion } from "@/lib/photos";
import type { Visit } from "@/lib/progress";
import type { TripCity } from "@/lib/rules";

/** A city's photo: which photo, its version (for its address, slice 31), and
 * the date of the visit it's from. */
export type CityPhoto = { photoId: number; visitDate: string; version: string };

/** One photo of a city visit, as the database query gives it. */
export type CityPhotoRow = { state: string; city: string | null; photoId: number; visitDate: string; fullPath: string };

/** The key a city is found by, e.g. "CO|Denver" (the same key the map's dots use). */
export function cityKey(state: string, city: string): string {
  return `${state}|${city}`;
}

/** Pick each city's photo from rows that are already in order: most recent
 * visit first (on the same day, the one added later first), and within a
 * visit the oldest upload first. So the first row for a city is its photo. */
export function pickCityPhotos(rows: readonly CityPhotoRow[]): Map<string, CityPhoto> {
  const photos = new Map<string, CityPhoto>();
  for (const row of rows) {
    if (!row.city) continue; // only visits with a city count
    const key = cityKey(row.state, row.city);
    if (!photos.has(key)) photos.set(key, { photoId: row.photoId, visitDate: row.visitDate, version: photoVersion(row.fullPath) });
  }
  return photos;
}

// ---- A planned trip's visited cities (slice 28).

/** A trip city I've visited: my most recent visit's date there, and the city's photo (if it has one). */
export type VisitedCity = { lastVisit: string; photo: CityPhoto | null };

/** For the cities of `trips` that I've visited, keyed like "CO|Denver": the
 * date of my most recent visit there and the city's photo. Cities I haven't
 * visited aren't included. The visits and photos must be mine only. It's a
 * plain object (not a Map) so it can be passed to client components. */
export function visitedTripCities(
  trips: readonly { cities: readonly TripCity[] }[],
  visits: readonly Visit[],
  photos: ReadonlyMap<string, CityPhoto>,
): Record<string, VisitedCity> {
  // My most recent visit to each city ("YYYY-MM-DD" dates sort as text).
  const lastVisits = new Map<string, string>();
  for (const visit of visits) {
    if (!visit.city) continue; // a visit without a city doesn't visit any city
    const key = cityKey(visit.state, visit.city);
    const last = lastVisits.get(key);
    if (!last || visit.visitDate > last) lastVisits.set(key, visit.visitDate);
  }

  const visited: Record<string, VisitedCity> = {};
  for (const city of trips.flatMap((trip) => trip.cities)) {
    const key = cityKey(city.state, city.name);
    const lastVisit = lastVisits.get(key);
    if (lastVisit) visited[key] = { lastVisit, photo: photos.get(key) ?? null };
  }
  return visited;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2024-07-04" → "July 2024". Worked out from the text with fixed English
 * month names, so the server and the browser always agree. */
export function monthYear(date: string): string {
  const [year, month] = date.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}
