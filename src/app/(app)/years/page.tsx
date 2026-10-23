import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { YearsSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { YearsBoard } from "@/components/years/years-board";
import { appDatabase } from "@/db/app";
import { requireUserId } from "@/lib/auth/server";
import { loadTrips, loadVisits } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { yearPlan } from "@/lib/progress";

export const metadata: Metadata = { title: "Years" };

// One column per year with its trips, new states and running total. Trips move
// between years by dragging or with their "Move to" menu.
export default function YearsPage() {
  return (
    <PageBody>
      <PageTitle>Years</PageTitle>
      <p className="text-sm text-muted-foreground">
        Drag a trip by its handle to another year, or use its “Move to” menu.
      </p>
      <Suspense fallback={<YearsSkeleton />}>
        <Years />
      </Suspense>
    </PageBody>
  );
}

/** The columns, read fresh from the database on every visit. */
async function Years() {
  await connection();
  const userId = await requireUserId(); // only this person's visits and trips
  const db = await appDatabase();
  const plan = yearPlan({ visits: await loadVisits(db, userId), trips: await loadTrips(db, userId) }, todayIn());
  return <YearsBoard plan={plan} />;
}
