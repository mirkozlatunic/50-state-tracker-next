// For phones: the four Census regions as cards, with the same colors and rules
// as the map (year filter included), and the next trip on top.

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { STATE_NAMES } from "@/lib/data/states";
import type { RegionSummary, StateStatus, Trip } from "@/lib/progress";

const CHIP: Record<StateStatus, string> = {
  visited: "bg-visited/15 text-visited-text",
  planned: "bg-planned/25 text-foreground",
  unvisited: "bg-muted text-muted-foreground",
};

/** One region: its name, "6 of 13", a green/orange bar, and a chip per state. */
export function RegionCard({ region }: { region: RegionSummary }) {
  const headingId = `region-${region.name.toLowerCase()}`;
  return (
    <section aria-labelledby={headingId}>
      <Card size="sm">
        <CardHeader className="flex items-center justify-between">
          <h2 id={headingId} className="font-semibold">{region.name}</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {region.visited} of {region.total}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-unvisited" aria-hidden>
            <span className="bg-visited" style={{ width: `${region.visitedPercent}%` }} />
            <span className="bg-planned" style={{ width: `${region.plannedPercent}%` }} />
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {region.states.map((state) => (
              <li key={state.code}>
                <Link
                  href={`/states/${state.code}`}
                  data-status={state.status}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm pointer-coarse:min-h-11 ${CHIP[state.status]}`}
                >
                  {state.name}
                  {state.cityCount > 0 && (
                    <span className="rounded-full bg-background/70 px-1.5 text-xs tabular-nums">{state.cityCount}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

/** The soonest trip that hasn't ended, or an offer to plan one. */
export function NextTripCard({ next }: { next: { trip: Trip; when: string } | null }) {
  return (
    <section aria-label="Next trip">
      <Card size="sm">
        <CardContent className="flex flex-col gap-1">
          {next ? (
            <>
              <p className="text-sm text-muted-foreground">Next trip · {next.when}</p>
              <Link href="/trips" className="text-lg font-semibold hover:underline">
                {next.trip.name}
              </Link>
              <p className="text-sm tabular-nums">
                {next.trip.startDate} to {next.trip.endDate}
              </p>
              <p className="text-sm">
                {next.trip.states.map((code) => STATE_NAMES[code]).sort().join(", ")}
                {next.trip.cities.length > 0 && (
                  <span className="text-muted-foreground"> · {next.trip.cities.map((city) => city.name).join(", ")}</span>
                )}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p>No trips planned yet.</p>
              <Link href="/trips/new" className={buttonVariants({ size: "sm" })} data-slot="button">
                Plan a trip
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
