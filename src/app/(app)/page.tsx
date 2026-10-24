import { Suspense } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { connection } from "next/server";
import { CounterSkeleton, MapSkeleton } from "@/components/loading-skeletons";
import { UsMap } from "@/components/map/us-map";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { appDatabase } from "@/db/app";
import { loadTrips, loadVisits, visitedStateCount } from "@/db/queries";
import { MILESTONES, milestoneProgress } from "@/lib/milestones";
import { requireUserId } from "@/lib/auth/server";
import { todayIn } from "@/lib/dates";
import { stateStatuses } from "@/lib/progress";

// The home page, laid out like the approved reference: the heading and a
// "Start tracking" button next to your own map (stacked on phones), and your
// numbers underneath. No page title of its own, so the tab says "50 States Tracker".
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-8 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
        <div className="flex flex-col items-start gap-5">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Explore · Visit · Complete</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            <span className="block">All 50 States.</span> <span className="block">One Journey.</span>
          </h1>
          <p className="max-w-sm text-muted-foreground">
            Track your visits, see your progress, and plan your next trips across the USA.
          </p>
          {/* cn() lets the pill shape replace the button's usual corners. */}
          <Link href="/visits/new" data-slot="button" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-5")}>
            Start tracking
          </Link>
        </div>
        <Suspense fallback={<MapSkeleton />}>
          <HomeMap />
        </Suspense>
      </div>
      <Suspense fallback={<CounterSkeleton />}>
        <HomeStats />
      </Suspense>
    </main>
  );
}

/** My map: visited and planned states (same rules as the map page), without the city dots. */
async function HomeMap() {
  await connection(); // read the data on every visit, never once at build time
  const userId = await requireUserId(); // only this person's visits and trips
  const db = await appDatabase();
  const data = { visits: await loadVisits(db, userId), trips: await loadTrips(db, userId) };
  return <UsMap statuses={stateStatuses(data, todayIn())} dots={[]} />;
}

/** My numbers (50 states, visited, remaining) and my milestones (10, 25, 50). */
async function HomeStats() {
  await connection();
  const userId = await requireUserId();
  const visited = await visitedStateCount(await appDatabase(), userId);
  const numbers = [
    [50, "States"],
    [visited, "Visited"],
    [50 - visited, "Remaining"],
  ] as const;
  const progress = milestoneProgress(visited);
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Progress" className="grid grid-cols-3 divide-x divide-border rounded-xl border bg-card py-5">
        {numbers.map(([value, label]) => (
          <li key={label} className="flex flex-col items-center gap-1">
            <span className="text-3xl font-semibold tabular-nums">{value}</span>{" "}
            <span className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">{label}</span>
          </li>
        ))}
      </ul>
      {/* Reached: gold with a check mark (and "reached" for screen readers); the
          next one says how far it is. */}
      <ul aria-label="Milestones" className="flex flex-wrap justify-center gap-2">
        {MILESTONES.map((at) => {
          const reached = progress.reached.includes(at);
          return (
            <li
              key={at}
              data-reached={reached ? "" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                reached ? "bg-planned font-medium text-planned-foreground" : "border text-muted-foreground"
              }`}
            >
              {reached && <Check className="size-3.5" aria-hidden />}
              {at} states
              {reached && <span className="sr-only">, reached</span>}
              {progress.next?.at === at && `: ${progress.next.toGo} to go`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
