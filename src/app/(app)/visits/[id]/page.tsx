import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { removeVisit } from "@/app/(app)/visits/actions";
import { EditDeleteActions } from "@/components/edit-delete-actions";
import { StateSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { PhotoGallery } from "@/components/photo-gallery";
import { StoryEditor } from "@/components/story-editor";
import { appDatabase } from "@/db/app";
import { getVisit, photosForVisit } from "@/db/queries";
import { requireUserId } from "@/lib/auth/server";
import { STATE_NAMES } from "@/lib/data/states";

export const metadata: Metadata = { title: "Visit" };

// One visit's own page: its details, Edit and Delete, its photos and its story.
export default function VisitPage({ params }: PageProps<"/visits/[id]">) {
  return (
    <PageBody narrow>
      <Suspense fallback={<StateSkeleton />}>
        <VisitContent params={params} />
      </Suspense>
    </PageBody>
  );
}

/** Everything about the visit, read fresh; someone else's or an unknown visit is "Not found". */
async function VisitContent({ params }: Pick<PageProps<"/visits/[id]">, "params">) {
  await connection();
  const userId = await requireUserId(); // only this person's visits
  const id = Number((await params).id);
  const db = await appDatabase();
  const visit = Number.isInteger(id) ? await getVisit(db, userId, id) : null;
  if (!visit) notFound();
  const photos = await photosForVisit(db, userId, visit.id);
  const stateName = STATE_NAMES[visit.state];

  return (
    <>
      <p>
        <Link href={`/states/${visit.state}`} className="text-sm text-muted-foreground hover:underline">
          ← {stateName}
        </Link>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <PageTitle>Visit to {stateName}</PageTitle>
          <p className="text-muted-foreground tabular-nums">
            {visit.visitDate}
            {visit.city && ` · ${visit.city}`}
          </p>
        </div>
        <EditDeleteActions
          editHref={`/visits/${visit.id}/edit`}
          question="Delete this visit?"
          details={`The visit on ${visit.visitDate} in ${stateName} will be gone for good.`}
          deleteAction={removeVisit.bind(null, visit.id)}
        />
      </div>
      {visit.note && <p>{visit.note}</p>}
      {/* id="photos": the state page's "Add photos" jumps here (slice 29); scroll-mt
          leaves room for the floating header above the heading. */}
      <section
        id="photos"
        aria-labelledby="photos-heading"
        className="flex scroll-mt-[calc(env(safe-area-inset-top)+5rem)] flex-col gap-3 border-t pt-6"
      >
        <h2 id="photos-heading" className="text-lg font-semibold">
          Photos
        </h2>
        <PhotoGallery visitId={visit.id} photos={photos.map(({ id, width, height }) => ({ id, width, height }))} />
      </section>
      <section aria-labelledby="story-heading" className="flex flex-col gap-3 border-t pt-6">
        <h2 id="story-heading" className="text-lg font-semibold">
          Story
        </h2>
        <StoryEditor visitId={visit.id} story={visit.story} />
      </section>
    </>
  );
}
