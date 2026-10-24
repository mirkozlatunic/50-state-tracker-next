import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BrandLogo } from "@/components/brand-logo";
import { MapSkeleton } from "@/components/loading-skeletons";
import { MapLegend } from "@/components/map/map-legend";
import { NextTripCard } from "@/components/map/region-cards";
import { UsMap } from "@/components/map/us-map";
import { ProgressStats } from "@/components/progress-stats";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import { STATE_NAMES } from "@/lib/data/states";
import { todayIn } from "@/lib/dates";
import { demoData } from "@/lib/demo-data";
import { cityDots, countVisitedStates, nextTrip, stateStatuses } from "@/lib/progress";

// The landing page ("/", slice 21). Signed out, it's the front door: the
// heading, a "Start tracking" button (to sign in) and a sample dashboard with
// made-up data (src/lib/demo-data.ts), so people can see what the app looks
// like. Signed in, it sends you on to your map. It sits outside the (app)
// folder, so it has its own small top bar instead of the app's header.
// No page title of its own, so the tab says "50 States Tracker".
export default function LandingPage() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <Link href="/" aria-label="50 States Tracker" data-slot="button" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <BrandLogo pixels={28} />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/sign-in" data-slot="button" className={buttonVariants({ variant: "outline" })}>
            Sign in
          </Link>
        </div>
      </header>
      <Suspense fallback={<LandingSkeleton />}>
        <LandingContent />
      </Suspense>
    </>
  );
}

/** Signed in: off to the map (proxy.ts already does this; this is the page's own
 * check, like every page has). Signed out: the landing page. */
async function LandingContent() {
  await connection(); // check who's signed in on every visit, never once at build time
  const { userId } = await auth();
  if (userId) redirect("/map");
  return <Landing today={todayIn()} />;
}

/** The heading and button beside the sample map, then the sample numbers and trips. */
function Landing({ today }: { today: string }) {
  const data = demoData(today);
  // The three most recent sample visits, newest first.
  const recent = [...data.visits].sort((a, b) => b.visitDate.localeCompare(a.visitDate)).slice(0, 3);
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
          <Link href="/sign-in" data-slot="button" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-5")}>
            Start tracking
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <SampleLabel />
          {/* linked={false}: the sample states don't lead into the (private) state pages. */}
          <UsMap statuses={stateStatuses(data, today)} dots={cityDots(data, today)} linked={false} />
        </div>
      </div>
      <ProgressStats visited={countVisitedStates(data.visits)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <NextTripCard next={nextTrip(data.trips, today)} linked={false} />
        <section aria-label="Recent visits">
          <Card size="sm">
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Recent visits</p>
              <ul className="flex flex-col gap-1">
                {recent.map((visit) => (
                  <li key={`${visit.state}-${visit.visitDate}`} className="flex justify-between gap-3 text-sm">
                    <span>
                      {visit.city}, {STATE_NAMES[visit.state]}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{visit.visitDate}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
      <MapLegend year={null} />
    </main>
  );
}

/** The small badge that says the dashboard is made up. */
function SampleLabel() {
  return (
    <p className="self-end rounded-full border px-3 py-0.5 text-xs font-medium tracking-wide text-muted-foreground">
      Sample data
    </p>
  );
}

/** While we check who's signed in. */
function LandingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12">
      <MapSkeleton />
    </main>
  );
}
