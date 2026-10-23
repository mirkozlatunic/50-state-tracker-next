import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FormSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { VisitForm } from "@/components/visit-form";
import { appDatabase } from "@/db/app";
import { requireUserId } from "@/lib/auth/server";
import { getVisit } from "@/db/queries";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit visit" };

// The edit form for one visit, filled in. Same rules as adding a visit.
export default function EditVisitPage({ params }: PageProps<"/visits/[id]/edit">) {
  return (
    <PageBody narrow>
      <PageTitle>Edit visit</PageTitle>
      <Suspense fallback={<FormSkeleton />}>
        <EditVisitForm params={params} />
      </Suspense>
    </PageBody>
  );
}

/** The form, once the visit is loaded; an unknown visit shows "Not found". */
async function EditVisitForm({ params }: Pick<PageProps<"/visits/[id]/edit">, "params">) {
  await connection();
  const userId = await requireUserId(); // only this person's visits and trips
  const id = Number((await params).id);
  const visit = Number.isInteger(id) ? await getVisit(await appDatabase(), userId, id) : null;
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
