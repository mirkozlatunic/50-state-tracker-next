// A planned trip's cities (slice 28): the ones I haven't visited stay in one
// plain text line, as before; each one I have visited gets a small row with its
// photo (if it has one) and "Visited <month year>". Used by /trips, the /years
// trip cards and the phone next-trip card on /map. It has no hooks, so it works
// in server and client components alike.

import Image from "next/image";
import { cityKey, monthYear, type VisitedCity } from "@/lib/city-photos";
import { cityPhotoAlt } from "@/lib/map-view";
import { photoSrc } from "@/lib/photos";
import type { TripCity } from "@/lib/rules";

export function TripCities({
  cities,
  visited = {},
  label,
  withState = false,
}: {
  cities: readonly TripCity[];
  /** My visited trip cities, keyed like "CO|Denver" (from visitedTripCities). */
  visited?: Readonly<Record<string, VisitedCity>>;
  /** What goes before the plain line, e.g. "Cities: " on /trips. */
  label?: string;
  /** Show "Denver, CO" instead of "Denver". */
  withState?: boolean;
}) {
  /** A city's name as this place shows it. */
  const nameOf = (city: TripCity) => (withState ? `${city.name}, ${city.state}` : city.name);
  const notVisited = cities.filter((city) => !visited[cityKey(city.state, city.name)]);
  const wasVisited = cities.filter((city) => visited[cityKey(city.state, city.name)]);

  return (
    <>
      {notVisited.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {label}
          {notVisited.map(nameOf).join(withState ? "; " : ", ")}
        </p>
      )}
      {wasVisited.length > 0 && (
        <ul aria-label="Cities I've visited" className="flex flex-col gap-1.5">
          {wasVisited.map((city) => {
            const { lastVisit, photo } = visited[cityKey(city.state, city.name)];
            return (
              <li key={cityKey(city.state, city.name)} className="flex items-center gap-2 text-sm">
                {photo && (
                  // unoptimized: the browser fetches the preview itself, signed in as its owner.
                  <Image
                    src={photoSrc(photo.photoId, photo.version, "thumb")}
                    alt={cityPhotoAlt({ name: city.name, state: city.state }, photo.visitDate)}
                    width={40}
                    height={40}
                    loading="lazy"
                    unoptimized
                    className="size-10 shrink-0 rounded-md bg-muted object-cover"
                  />
                )}
                <span className="flex flex-col">
                  <span>{nameOf(city)}</span>
                  <span className="text-xs text-muted-foreground">Visited {monthYear(lastVisit)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
