import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { removeTrip } from "@/app/(app)/trips/actions";
import { EditDeleteActions } from "@/components/edit-delete-actions";
import { ListSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { TripCities } from "@/components/trip-cities";
import { buttonVariants } from "@/components/ui/button";
import { appDatabase } from "@/db/app";
import { requireUserId } from "@/lib/auth/server";
import { cityPhotos, loadTrips, loadVisits } from "@/db/queries";
import { visitedTripCities } from "@/lib/city-photos";
import { todayIn } from "@/lib/dates";
import { STATE_NAMES } from "@/lib/data/states";
import { upcomingTrips } from "@/lib/progress";

export const metadata: Metadata = { title: "Trips" };

// The planned trips that haven't ended yet, soonest first. Since slice 28 the
// cities I've already visited show their photo and when I was there.
export default function TripsPage() {
  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Planned trips</PageTitle>
        <Link href="/trips/new" className={buttonVariants()} data-slot="button">
          Plan a trip
        </Link>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <TripList />
      </Suspense>
    </PageBody>
  );
}

/** The list itself, read fresh from the database on every visit. */
async function TripList() {
  await connection();
  const userId = await requireUserId(); // only this person's visits and trips
  const db = await appDatabase();
  const trips = upcomingTrips(await loadTrips(db, userId), todayIn());
  if (trips.length === 0) return <p className="text-muted-foreground">No trips planned yet.</p>;
  const visited = visitedTripCities(trips, await loadVisits(db, userId), await cityPhotos(db, userId));

  return (
    <ul aria-label="Trips" className="flex flex-col divide-y rounded-lg border">
      {trips.map((trip) => (
        <li key={trip.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3">
          <div className="flex flex-col gap-1">
            <p>
              <strong className="font-semibold">{trip.name}</strong>{" "}
              <span className="text-sm text-muted-foreground tabular-nums">
                {trip.startDate} to {trip.endDate}
              </span>
            </p>
            <p className="text-sm">
              {[...trip.states]
                .sort((a, b) => STATE_NAMES[a].localeCompare(STATE_NAMES[b]))
                .map((code, index) => (
                  <span key={code}>
                    {index > 0 && ", "}
                    <Link href={`/states/${code}`} className="hover:underline">
                      {STATE_NAMES[code]}
                    </Link>
                  </span>
                ))}
            </p>
            <TripCities cities={trip.cities} visited={visited} label="Cities: " withState />
          </div>
          <EditDeleteActions
            editHref={`/trips/${trip.id}/edit`}
            question="Delete this trip?"
            details={`“${trip.name}” and its states and cities will be gone for good.`}
            deleteAction={removeTrip.bind(null, trip.id, "")}
          />
        </li>
      ))}
    </ul>
  );
}
