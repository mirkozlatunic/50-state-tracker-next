import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { FormSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { VisitForm } from "@/components/visit-form";
import { todayIn } from "@/lib/dates";
import { STATE_CODES } from "@/lib/data/states";

export const metadata: Metadata = { title: "Add a visit" };

// The add-visit form. ?state=CA in the address picks that state.
export default function NewVisitPage({ searchParams }: PageProps<"/visits/new">) {
  return (
    <PageBody narrow>
      <PageTitle>Add a visit</PageTitle>
      <Suspense fallback={<FormSkeleton />}>
        <NewVisitForm searchParams={searchParams} />
      </Suspense>
    </PageBody>
  );
}

/** The form, once the address (?state=...) and today's date are known. */
async function NewVisitForm({ searchParams }: Pick<PageProps<"/visits/new">, "searchParams">) {
  await connection(); // "today" must be the visitor's today, not the build's
  const linked = String((await searchParams).state ?? "").toUpperCase();
  const state = STATE_CODES.has(linked) ? linked : "";
  return (
    <VisitForm
      visitId={null}
      initial={{ state, visitDate: "", city: "", note: "" }}
      today={todayIn()}
      saveLabel="Save visit"
      cancelHref={state ? `/states/${state}` : "/states"}
    />
  );
}
