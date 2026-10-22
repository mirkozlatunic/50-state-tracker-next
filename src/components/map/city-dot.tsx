"use client";
// One city dot over the map: a small round button. Clicking it (or hovering
// with a mouse) opens a shadcn Popover with the city's visits and trips, and a
// link to its state. A tap works the same on the iPhone.

import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CityDot({
  label,
  kind,
  details,
  stateCode,
  stateName,
  left,
  top,
}: {
  label: string;
  kind: "visited" | "upcoming";
  details: string;
  stateCode: string;
  stateName: string;
  left: string;
  top: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={100}
        aria-label={label}
        data-kind={kind}
        style={{ left, top }}
        // The dot is 9px; the invisible ::after ring makes it easier to hit.
        className={`absolute size-[9px] -translate-1/2 rounded-full ring-[1.5px] ring-dot-ring after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-ring ${
          kind === "upcoming" ? "bg-dot-upcoming" : "bg-dot-visited"
        }`}
      />
      <PopoverContent side="top" className="w-64">
        <p>{details}</p>
        <Link href={`/states/${stateCode}`} className="font-medium hover:underline">
          Open {stateName} →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
