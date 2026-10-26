import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CounterSkeleton, MapSkeleton } from "@/components/loading-skeletons";
import { MapLegend } from "@/components/map/map-legend";
import { NextTripCard, RegionCard } from "@/components/map/region-cards";
import { UsMap } from "@/components/map/us-map";
import { YearFilter } from "@/components/map/year-filter";
import { PageBody, PageTitle } from "@/components/page-title";
import { ProgressStats } from "@/components/progress-stats";
import { appDatabase } from "@/db/app";
import { requireUserId } from "@/lib/auth/server";
import { cityPhotos, loadTrips, loadVisits, visitedStateCount } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { readMapYear, withCityPhotos } from "@/lib/map-view";
import { cityDots, nextTrip, regionSummaries, stateStatuses, tripYears } from "@/lib/progress";

export const metadata: Metadata = { title: "Map" };

// The map: green = visited, orange = in a trip that hasn't ended, grey =
// neither, with city dots. On phones (below 640px) the next trip and the four
// region cards show instead. ?year=2027 only counts trips starting in 2027.
// Since slice 21 it's the first page after signing in, so your numbers and
// milestones (once on the home page) sit at the top.
// Since slice 27 a visited city's pop-up shows its photo (see city-photos.ts).
export default function MapPage({ searchParams }: PageProps<"/map">) {
  return (
    <PageBody>
      <PageTitle>Map</PageTitle>
      <Suspense fallback={<CounterSkeleton />}>
        <MyStats />
      </Suspense>
      <Suspense fallback={<MapSkeleton />}>
        <MapContent searchParams={searchParams} />
      </Suspense>
    </PageBody>
  );
}

/** My numbers (50 states, visited, remaining) and my milestones (10, 25, 50). */
async function MyStats() {
  await connection(); // read the data on every visit, never once at build time
  const userId = await requireUserId();
  return <ProgressStats visited={await visitedStateCount(await appDatabase(), userId)} />;
}

/** Everything that depends on the data and the address, read fresh on every visit. */
async function MapContent({ searchParams }: Pick<PageProps<"/map">, "searchParams">) {
  await connection();
  const userId = await requireUserId(); // only this person's visits and trips
  const year = readMapYear(String((await searchParams).year ?? ""));
  const db = await appDatabase();
  const data = { visits: await loadVisits(db, userId), trips: await loadTrips(db, userId) };
  const today = todayIn();
  const dots = withCityPhotos(cityDots(data, today, year ?? undefined), await cityPhotos(db, userId));

  return (
    <>
      <YearFilter year={year} years={tripYears(data.trips, today)} />

      {/* Phones: the next trip and the region cards. */}
      <div className="flex flex-col gap-3 sm:hidden">
        <NextTripCard next={nextTrip(data.trips, today)} />
        {regionSummaries(data, today, year ?? undefined).map((region) => (
          <RegionCard key={region.name} region={region} />
        ))}
      </div>

      {/* Bigger screens: the map. */}
      <div className="hidden flex-col gap-4 sm:flex">
        <UsMap statuses={stateStatuses(data, today, year ?? undefined)} dots={dots} />
        <MapLegend year={year} />
        <p className="text-sm text-muted-foreground">
          Tiny states like Rhode Island are easier to pick from the{" "}
          <Link href="/states" className="underline">
            States list
          </Link>
          .
        </p>
      </div>
    </>
  );
}
