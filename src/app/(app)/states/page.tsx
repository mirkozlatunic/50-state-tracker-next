import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { StatesSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { StatesSearch } from "@/components/states-search";
import { appDatabase } from "@/db/app";
import { listStates } from "@/db/queries";

export const metadata: Metadata = { title: "States" };

// All 50 states A to Z, with the visited ones marked and a search box.
export default function StatesPage() {
  return (
    <PageBody>
      <PageTitle>States</PageTitle>
      <Suspense fallback={<StatesSkeleton />}>
        <StatesList />
      </Suspense>
    </PageBody>
  );
}

/** The list, read fresh from the database on every visit. */
async function StatesList() {
  await connection();
  return <StatesSearch states={await listStates(await appDatabase())} />;
}
