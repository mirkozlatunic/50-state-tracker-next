import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { PageBody, PageTitle } from "@/components/page-title";
import { VisitActions } from "@/components/visit-actions";
import { appDatabase } from "@/db/app";
import { loadTrips, visitsForState } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { STATES, STATE_NAMES } from "@/lib/data/states";
import { upcomingTrips } from "@/lib/progress";

/** The 50 state pages are known ahead of time (proxy.ts turns away other codes). */
export function generateStaticParams() {
  return STATES.map(([code]) => ({ code }));
}

export async function generateMetadata({ params }: PageProps<"/states/[code]">): Promise<Metadata> {
  return { title: STATE_NAMES[(await params).code] };
}

// One state: its visits (newest first) and the upcoming trips that include it.
export default function StatePage({ params }: PageProps<"/states/[code]">) {
  return (
    <PageBody>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <StateContent params={params} />
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
async function StateContent({ params }: Pick<PageProps<"/states/[code]">, "params">) {
  const { code } = await params;
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
      <StateDetails code={code} />
    </>
  );
}

/** The visits and trips, read fresh from the database on every visit. */
async function StateDetails({ code }: { code: string }) {
  await connection();
  const db = await appDatabase();
  const visits = await visitsForState(db, code);
  const trips = upcomingTrips(await loadTrips(db), todayIn()).filter((trip) => trip.states.includes(code));

  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Visits</h2>
        {visits.length === 0 ? (
          <p className="text-muted-foreground">No visits yet.</p>
        ) : (
          <ul aria-label="Visits" className="flex flex-col divide-y rounded-lg border">
            {visits.map((visit) => (
              <li key={visit.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
                <span>
                  <span className="font-medium tabular-nums">{visit.visitDate}</span>
                  {visit.city && <> · {visit.city}</>}
                  {visit.note && <span className="text-muted-foreground"> · {visit.note}</span>}
                </span>
                <VisitActions visitId={visit.id} label={`${visit.visitDate} in ${STATE_NAMES[code]}`} />
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
