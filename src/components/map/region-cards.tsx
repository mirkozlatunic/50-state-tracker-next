// For phones: the four Census regions as cards, with the same colors and rules
// as the map (year filter included), and the next trip on top.

import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { STATE_NAMES } from "@/lib/data/states";
import type { RegionSummary, StateStatus, Trip } from "@/lib/progress";

// Planned chips get the map's thin navy stripes over a light gold (see map-legend.tsx).
const CHIP: Record<StateStatus, string> = {
  visited: "bg-visited/15 text-visited-text",
  planned:
    "bg-planned/25 text-foreground [background-image:repeating-linear-gradient(45deg,color-mix(in_srgb,var(--planned-foreground)_15%,transparent)_0_1.5px,transparent_1.5px_6px)]",
  unvisited: "bg-muted text-muted-foreground",
};

// What screen readers hear after the state's name; "not visited" says nothing.
const STATUS_WORDS: Record<StateStatus, string> = { visited: ", visited", planned: ", planned", unvisited: "" };

/** One region: its name, "6 of 13", a sage/gold bar, and a chip per state. */
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
                  // What screen readers hear, e.g. "Colorado, visited, 2 visited cities".
                  aria-label={`${state.name}${STATUS_WORDS[state.status]}${
                    state.cityCount > 0 ? `, ${state.cityCount} visited ${state.cityCount === 1 ? "city" : "cities"}` : ""
                  }`}
                  data-stripes-swatch={state.status === "planned" ? "" : undefined}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm pointer-coarse:min-h-11 ${CHIP[state.status]}`}
                >
                  {state.status === "visited" && <Check className="size-3.5" aria-hidden />}
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

/** The soonest trip that hasn't ended, or an offer to plan one. `linked={false}`:
 * the trip's name is plain text (the landing page's sample has nowhere to link). */
export function NextTripCard({ next, linked = true }: { next: { trip: Trip; when: string } | null; linked?: boolean }) {
  return (
    <section aria-label="Next trip">
      <Card size="sm">
        <CardContent className="flex flex-col gap-1">
          {next ? (
            <>
              <p className="text-sm text-muted-foreground">Next trip · {next.when}</p>
              {linked ? (
                <Link href="/trips" className="text-lg font-semibold hover:underline">
                  {next.trip.name}
                </Link>
              ) : (
                <p className="text-lg font-semibold">{next.trip.name}</p>
              )}
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
