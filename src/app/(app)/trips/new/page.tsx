import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageBody, PageTitle } from "@/components/page-title";
import { TripForm } from "@/components/trip-form";
import { todayIn } from "@/lib/dates";
import { readYear, startDateLimits } from "@/lib/trip-form";

export const metadata: Metadata = { title: "Plan a trip" };

// The plan-a-trip form. With ?year=2027 (from the years page) the start stays
// inside that year and saving goes back to the years page.
export default function NewTripPage({ searchParams }: PageProps<"/trips/new">) {
  return (
    <PageBody narrow>
      <Suspense>
        <NewTrip searchParams={searchParams} />
      </Suspense>
    </PageBody>
  );
}

/** The heading and form, once the address (?year=...) and today's date are known. */
async function NewTrip({ searchParams }: Pick<PageProps<"/trips/new">, "searchParams">) {
  await connection(); // "today" must be the visitor's today, not the build's
  const today = todayIn();
  const year = readYear(String((await searchParams).year ?? ""), today);
  const { min, max } = startDateLimits({ today, year });
  return (
    <>
      <PageTitle>{year ? `Plan a trip in ${year}` : "Plan a trip"}</PageTitle>
      <TripForm
        tripId={null}
        initial={{ name: "", startDate: "", endDate: "", states: [], cities: [] }}
        startMin={min}
        startMax={max}
        saveLabel="Save trip"
        returnTo={year ? "years" : ""}
      />
    </>
  );
}
