"use client";
// One trip on the years page: name, dates, states and cities, Edit/Delete, a
// grip handle to drag it to another year, and the "Move to" menu (which also
// works with a keyboard).

import { useState } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { removeTrip } from "@/app/(app)/trips/actions";
import { EditDeleteActions } from "@/components/edit-delete-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATE_NAMES } from "@/lib/data/states";
import type { Trip } from "@/lib/progress";

export function TripCard({
  trip,
  moveTo,
  onMove,
  pending,
}: {
  trip: Trip;
  moveTo: number[];
  onMove: (tripId: number, year: number) => void;
  pending: boolean;
}) {
  // useDraggable makes the card movable; the handle gets the drag listeners.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: trip.id });
  const [year, setYear] = useState<number | null>(moveTo[0] ?? null);
  const nameId = `trip-${trip.id}-name`;

  return (
    <article
      ref={setNodeRef}
      aria-labelledby={nameId}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={isDragging ? "relative z-50 opacity-90 shadow-lg" : undefined}
    >
      <Card size="sm">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Drag ${trip.name} to another year`}
              // touch-none: the finger drags the card instead of scrolling the page.
              className="-ml-1 cursor-grab touch-none text-muted-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden />
            </Button>
            <div className="flex min-w-0 flex-col gap-0.5">
              <strong id={nameId} className="font-semibold">{trip.name}</strong>
              <span className="text-sm text-muted-foreground tabular-nums">
                {trip.startDate} to {trip.endDate}
              </span>
              <span className="text-sm">
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
              </span>
              {trip.cities.length > 0 && (
                <span className="text-sm text-muted-foreground">{trip.cities.map((city) => city.name).join(", ")}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* The "Move to" row: the year menu and the Move button on one line, same height. */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Move to</span>
              <Select items={moveTo.map((option) => ({ value: option, label: String(option) }))} value={year} onValueChange={setYear}>
                <SelectTrigger aria-label={`Move ${trip.name} to`} className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moveTo.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" disabled={pending || year === null} onClick={() => year !== null && onMove(trip.id, year)}>
                Move
              </Button>
            </div>
            <EditDeleteActions
              editHref={`/trips/${trip.id}/edit?return_to=years`}
              question="Delete this trip?"
              details={`“${trip.name}” and its states and cities will be gone for good.`}
              deleteAction={removeTrip.bind(null, trip.id, "years")}
            />
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
