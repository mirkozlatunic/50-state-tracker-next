"use client";
// One city dot over the map: a small round button. Clicking it (or hovering
// with a mouse) opens a shadcn Popover with the city's visits and trips, and a
// link to its state (unless `linked` is false). A tap works the same on the iPhone.
// Slice 27: a visited city with a photo shows its 400 px preview above the
// text, with the date of that visit. The pop-up's content is only put on the
// page while it's open, so the photo is only loaded then, not with the map.

import Image from "next/image";
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
  linked = true,
  photo,
}: {
  label: string;
  kind: "visited" | "upcoming";
  details: string;
  stateCode: string;
  stateName: string;
  left: string;
  top: string;
  linked?: boolean;
  photo?: { src: string; alt: string; visitDate: string };
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
        // A visited city is a solid dot; an upcoming one is hollow with a gold
        // ring, so the two differ in shape and not only in color.
        className={`absolute size-[9px] -translate-1/2 rounded-full after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-ring ${
          kind === "upcoming" ? "bg-card ring-2 ring-dot-upcoming" : "bg-dot-visited ring-[1.5px] ring-dot-ring"
        }`}
      />
      <PopoverContent side="top" className="w-64">
        {photo && (
          <figure className="flex flex-col gap-1">
            {/* unoptimized: the photo is private, and next/image's resizer
                would fetch it without the owner's sign-in (and get "Not found"). */}
            <Image
              src={photo.src}
              alt={photo.alt}
              width={400}
              height={250}
              unoptimized
              className="aspect-8/5 w-full rounded-md bg-muted object-cover"
            />
            <figcaption className="text-xs text-muted-foreground tabular-nums">Photo: visit on {photo.visitDate}</figcaption>
          </figure>
        )}
        <p>{details}</p>
        {linked && (
          <Link href={`/states/${stateCode}`} className="font-medium hover:underline">
            Open {stateName} →
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
