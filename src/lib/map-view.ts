// Small helpers for the map page.

import { cityKey, type CityPhoto } from "@/lib/city-photos";
import { MAP_HEIGHT, MAP_WIDTH } from "@/lib/data/map";
import { STATE_NAMES } from "@/lib/data/states";
import type { CityDot } from "@/lib/progress";

/** A dot's details in one line, e.g.
 * "Denver, CO · visited 2024-07-04 · upcoming: Four Corners weekend (2026-10-30)". */
export function dotDetails(dot: CityDot): string {
  const parts = [`${dot.name}, ${dot.state}`];
  if (dot.visitDates.length) parts.push(`visited ${dot.visitDates.join(", ")}`);
  if (dot.trips.length) parts.push(`upcoming: ${dot.trips.map((trip) => `${trip.name} (${trip.startDate})`).join("; ")}`);
  return parts.join(" · ");
}

/** Give each visited city's dot its photo (slice 27). Dots of cities I haven't
 * visited, and cities without a photo, stay as they are. */
export function withCityPhotos(dots: CityDot[], photos: Map<string, CityPhoto>): CityDot[] {
  return dots.map((dot) => {
    const photo = dot.visitDates.length ? photos.get(cityKey(dot.state, dot.name)) : undefined;
    return photo ? { ...dot, photo: { id: photo.photoId, visitDate: photo.visitDate } } : dot;
  });
}

/** A city photo's alt text (what screen readers say), e.g.
 * "Photo from the visit to Denver, Colorado on 2024-07-04". */
export function cityPhotoAlt(dot: Pick<CityDot, "name" | "state">, visitDate: string): string {
  return `Photo from the visit to ${dot.name}, ${STATE_NAMES[dot.state]} on ${visitDate}`;
}

/** Where a dot sits over the map, as a share of its width and height, so it
 * stays on its city whatever size the map is drawn at. */
export function dotPosition(x: number, y: number) {
  /** A share as a CSS percentage, without long decimals. */
  const percent = (part: number, whole: number) => `${Math.round((10000 * part) / whole) / 100}%`;
  return { left: percent(x, MAP_WIDTH), top: percent(y, MAP_HEIGHT) };
}

/** The ?year= filter: a four-digit year, or null for "all upcoming trips". */
export function readMapYear(text: string | undefined | null): number | null {
  return text && /^\d{4}$/.test(text) ? Number(text) : null;
}
