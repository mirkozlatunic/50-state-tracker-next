import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { connection } from "next/server";
import { StateSkeleton } from "@/components/loading-skeletons";
import { buttonVariants } from "@/components/ui/button";
import { PageBody, PageTitle } from "@/components/page-title";
import { removeVisit } from "@/app/(app)/visits/actions";
import { EditDeleteActions } from "@/components/edit-delete-actions";
import { MilestoneCard } from "@/components/milestone-card";
import { appDatabase } from "@/db/app";
import { requireUserId } from "@/lib/auth/server";
import { celebratedMilestone, loadTrips, photoCounts, visitedStateCount, visitsForState } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { STATES, STATE_NAMES } from "@/lib/data/states";
import { PHOTO_MAX_PER_VISIT } from "@/lib/photos";
import { upcomingTrips } from "@/lib/progress";

/** The 50 state pages are known ahead of time (proxy.ts turns away other codes). */
export function generateStaticParams() {
  return STATES.map(([code]) => ({ code }));
}

export async function generateMetadata({ params }: PageProps<"/states/[code]">): Promise<Metadata> {
  return { title: STATE_NAMES[(await params).code] };
}

// One state: its visits (newest first) and the upcoming trips that include it.
// Since slice 29 each visit row has "Add photos" (to its visit page's photos).
export default function StatePage({ params, searchParams }: PageProps<"/states/[code]">) {
  return (
    <PageBody>
      <Suspense fallback={<StateSkeleton />}>
        <StateContent params={params} searchParams={searchParams} />
      </Suspense>
      <p>
        <Link href="/states" className="text-sm text-muted-foreground hover:underline">
          ← All states
        </Link>
      </p>
    </PageBody>
  );
}

/** The heading and details, once the address (/states/CA) is known. */
async function StateContent({ params, searchParams }: Pick<PageProps<"/states/[code]">, "params" | "searchParams">) {
  const { code } = await params;
  const milestone = Number((await searchParams).milestone ?? 0);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>
          {STATE_NAMES[code]} <span className="font-mono text-base text-muted-foreground">{code}</span>
        </PageTitle>
        <Link href={`/visits/new?state=${code}`} className={buttonVariants()} data-slot="button">
          Add a visit
        </Link>
      </div>
      <StateDetails code={code} milestone={milestone} />
    </>
  );
}

/** The visits and trips, read fresh from the database on every visit. */
/** `milestone`: from ?milestone=10 after saving a visit; shown only if it's
 * really the one just celebrated (typing it into the address does nothing). */
async function StateDetails({ code, milestone }: { code: string; milestone: number }) {
  await connection();
  const userId = await requireUserId(); // only this person's visits and trips
  const db = await appDatabase();
  const visits = await visitsForState(db, userId, code);
  const celebrate =
    milestone > 0 &&
    milestone === (await celebratedMilestone(db, userId)) &&
    (await visitedStateCount(db, userId)) >= milestone;
  const photos = await photoCounts(db, userId, visits.map((visit) => visit.id));
  const trips = upcomingTrips(await loadTrips(db, userId), todayIn()).filter((trip) => trip.states.includes(code));

  return (
    <>
      {celebrate && <MilestoneCard milestone={milestone} />}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Visits</h2>
        {visits.length === 0 ? (
          <p className="text-muted-foreground">No visits yet.</p>
        ) : (
          <ul aria-label="Visits" className="flex flex-col divide-y rounded-lg border">
            {visits.map((visit) => (
              <li key={visit.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
                <span>
                  {/* The date opens the visit's own page (details and story). */}
                  <Link href={`/visits/${visit.id}`} className="font-medium tabular-nums underline-offset-4 hover:underline">
                    {visit.visitDate}
                  </Link>
                  {visit.city && <> · {visit.city}</>}
                  {visit.note && <span className="text-muted-foreground"> · {visit.note}</span>}
                  {photos.has(visit.id) && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {photos.get(visit.id)} {photos.get(visit.id) === 1 ? "photo" : "photos"}
                    </span>
                  )}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {/* Left out once the visit has as many photos as it can have. */}
                  {(photos.get(visit.id) ?? 0) < PHOTO_MAX_PER_VISIT && (
                    <Link
                      href={`/visits/${visit.id}#photos`}
                      aria-label={`Add photos to the visit on ${visit.visitDate}`}
                      className={buttonVariants({ variant: "ghost" })}
                      data-slot="button"
                    >
                      <ImagePlus aria-hidden />
                      Add photos
                    </Link>
                  )}
                  <EditDeleteActions
                    editHref={`/visits/${visit.id}/edit`}
                    question="Delete this visit?"
                    details={`The visit on ${visit.visitDate} in ${STATE_NAMES[code]} will be gone for good.`}
                    deleteAction={removeVisit.bind(null, visit.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Planned trips</h2>
        {trips.length === 0 ? (
          <p className="text-muted-foreground">No trips planned here.</p>
        ) : (
          <ul aria-label="Planned trips" className="flex flex-col divide-y rounded-lg border">
            {trips.map((trip) => {
              const citiesHere = trip.cities.filter((city) => city.state === code).map((city) => city.name);
              return (
                <li key={trip.id} className="px-3 py-2">
                  <span className="font-medium">{trip.name}</span> · {trip.startDate} to {trip.endDate}
                  {citiesHere.length > 0 && <span className="text-muted-foreground"> · {citiesHere.join(", ")}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
