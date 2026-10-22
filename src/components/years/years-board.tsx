"use client";
// The years page's columns, with drag and drop (dnd-kit). A mouse drags right
// away; a finger holds the handle for a moment first, so normal scrolling still
// works. Dropping a card on another year moves the trip there, the same as its
// "Move to" menu.

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { moveTrip } from "@/app/(app)/trips/actions";
import { TripCard } from "@/components/years/trip-card";
import { buttonVariants } from "@/components/ui/button";
import type { YearPlan } from "@/lib/progress";
import { moveChoices } from "@/lib/years-view";

export function YearsBoard({ plan }: { plan: YearPlan[] }) {
  const [error, setError] = useState<string | null>(null);
  // useTransition: the page stays usable while the server moves the trip.
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const years = plan.map((column) => column.year);

  /** Ask the server to move a trip; show the reason if it can't. */
  function move(tripId: number, year: number) {
    startTransition(async () => setError((await moveTrip(tripId, String(year))).error));
  }

  /** A card was dropped: move it if it landed on a different year. */
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const from = plan.find((column) => column.trips.some((trip) => trip.id === active.id))?.year;
    const to = Number(over.id);
    if (from !== undefined && to !== from) move(Number(active.id), to);
  }

  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {/* id keeps dnd-kit's generated ids the same on the server and in the browser. */}
      <DndContext id="years-board" sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plan.map((column) => (
            <YearColumn key={column.year} column={column}>
              {column.trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  moveTo={moveChoices(years, column.year)}
                  onMove={move}
                  pending={pending}
                />
              ))}
            </YearColumn>
          ))}
        </div>
      </DndContext>
    </>
  );
}

/** One year: its heading, running total, trip cards, new states and a plan-a-trip link. It's also a drop target. */
function YearColumn({ column, children }: { column: YearPlan; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.year });
  const headingId = `year-${column.year}`;
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      data-year={column.year}
      className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors ${isOver ? "border-ring bg-muted" : "bg-muted/40"}`}
    >
      <div>
        <h2 id={headingId} className="text-lg font-semibold">{column.year}</h2>
        <p className="text-sm text-muted-foreground">
          By the end of {column.year}: {column.totalByEnd} of 50
        </p>
      </div>
      {children}
      <p className="text-sm text-muted-foreground">
        {column.trips.length === 0
          ? "No trips planned this year."
          : column.newStates.length
            ? `New states: ${column.newStates.join(", ")}`
            : "No new states this year."}
      </p>
      <Link href={`/trips/new?year=${column.year}`} className={buttonVariants({ variant: "outline" })} data-slot="button">
        Plan a trip in {column.year}
      </Link>
    </section>
  );
}
