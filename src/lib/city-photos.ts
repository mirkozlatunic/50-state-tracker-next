// Which photo each visited city shows (slice 27). A city's photo is the first
// photo (oldest upload) of my most recent visit to that city that has photos.
// Only visits with a city count. The photo is shown as its 400 px preview,
// /photos/<id>?size=thumb, which only its owner can open.

/** A city's photo: which photo, and the date of the visit it's from. */
export type CityPhoto = { photoId: number; visitDate: string };

/** One photo of a city visit, as the database query gives it. */
export type CityPhotoRow = { state: string; city: string | null; photoId: number; visitDate: string };

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
    if (!photos.has(key)) photos.set(key, { photoId: row.photoId, visitDate: row.visitDate });
  }
  return photos;
}
