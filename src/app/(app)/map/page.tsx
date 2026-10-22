import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MapLegend } from "@/components/map/map-legend";
import { NextTripCard, RegionCard } from "@/components/map/region-cards";
import { UsMap } from "@/components/map/us-map";
import { YearFilter } from "@/components/map/year-filter";
import { PageBody, PageTitle } from "@/components/page-title";
import { appDatabase } from "@/db/app";
import { loadTrips, loadVisits } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { readMapYear } from "@/lib/map-view";
import { cityDots, nextTrip, regionSummaries, stateStatuses, tripYears } from "@/lib/progress";

export const metadata: Metadata = { title: "Map" };

// The map: green = visited, orange = in a trip that hasn't ended, grey =
// neither, with city dots. On phones (below 640px) the next trip and the four
// region cards show instead. ?year=2027 only counts trips starting in 2027.
export default function MapPage({ searchParams }: PageProps<"/map">) {
  return (
    <PageBody>
      <PageTitle>Map</PageTitle>
      <Suspense fallback={<p className="text-muted-foreground">Loading the map…</p>}>
        <MapContent searchParams={searchParams} />
      </Suspense>
    </PageBody>
  );
}

/** Everything that depends on the data and the address, read fresh on every visit. */
async function MapContent({ searchParams }: Pick<PageProps<"/map">, "searchParams">) {
  await connection();
  const year = readMapYear(String((await searchParams).year ?? ""));
  const db = await appDatabase();
  const data = { visits: await loadVisits(db), trips: await loadTrips(db) };
  const today = todayIn();

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
        <UsMap statuses={stateStatuses(data, today, year ?? undefined)} dots={cityDots(data, today, year ?? undefined)} />
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
