import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageBody, PageTitle } from "@/components/page-title";
import { VisitForm } from "@/components/visit-form";
import { appDatabase } from "@/db/app";
import { getVisit } from "@/db/queries";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit visit" };

// The edit form for one visit, filled in. Same rules as adding a visit.
export default function EditVisitPage({ params }: PageProps<"/visits/[id]/edit">) {
  return (
    <PageBody narrow>
      <PageTitle>Edit visit</PageTitle>
      <Suspense>
        <EditVisitForm params={params} />
      </Suspense>
    </PageBody>
  );
}

/** The form, once the visit is loaded; an unknown visit shows "Not found". */
async function EditVisitForm({ params }: Pick<PageProps<"/visits/[id]/edit">, "params">) {
  await connection();
  const id = Number((await params).id);
  const visit = Number.isInteger(id) ? await getVisit(await appDatabase(), id) : null;
  if (!visit) notFound();
  return (
    <VisitForm
      visitId={visit.id}
      initial={{ state: visit.state, visitDate: visit.visitDate, city: visit.city ?? "", note: visit.note }}
      today={todayIn()}
      saveLabel="Save changes"
      cancelHref={`/states/${visit.state}`}
    />
  );
}
