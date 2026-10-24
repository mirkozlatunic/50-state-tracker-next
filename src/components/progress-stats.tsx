// The numbers (50 states, visited, remaining) and the milestones (10, 25, 50).
// Shown on the map page with your own count, and on the landing page with the
// sample's. It only draws; whoever uses it reads the count.

import { Check } from "lucide-react";
import { MILESTONES, milestoneProgress } from "@/lib/milestones";

/** The progress numbers and milestone pills for `visited` states. */
export function ProgressStats({ visited }: { visited: number }) {
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
