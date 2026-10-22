import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FormSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { TripForm } from "@/components/trip-form";
import { appDatabase } from "@/db/app";
import { getTrip } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { startDateLimits } from "@/lib/trip-form";

export const metadata: Metadata = { title: "Edit trip" };

// The edit form for one trip, filled in. A trip in progress may keep its start date.
export default function EditTripPage({ params, searchParams }: PageProps<"/trips/[id]/edit">) {
  return (
    <PageBody narrow>
      <PageTitle>Edit trip</PageTitle>
      <Suspense fallback={<FormSkeleton />}>
        <EditTrip params={params} searchParams={searchParams} />
      </Suspense>
    </PageBody>
  );
}

/** The form, once the trip is loaded; an unknown trip shows "Not found". */
async function EditTrip({ params, searchParams }: Pick<PageProps<"/trips/[id]/edit">, "params" | "searchParams">) {
  await connection();
  const id = Number((await params).id);
  const trip = Number.isInteger(id) ? await getTrip(await appDatabase(), id) : null;
  if (!trip) notFound();
  const { min } = startDateLimits({ today: todayIn(), keepStart: trip.startDate });
  return (
    <TripForm
      tripId={trip.id}
      initial={{
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        states: trip.states,
        cities: trip.cities.map((city) => `${city.name}, ${city.state}`),
      }}
      startMin={min}
      startMax={null}
      saveLabel="Save changes"
      returnTo={(await searchParams).return_to === "years" ? "years" : ""}
    />
  );
}
