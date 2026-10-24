"use server";
// Form actions for visits. "use server" means they run on the server when a
// form is sent; Next.js only accepts them from this site. Each one checks who's
// signed in itself (and only touches their own data), not only proxy.ts.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { appDatabase } from "@/db/app";
import {
  addVisit,
  celebratedMilestone,
  deletePhoto,
  deleteVisit,
  getVisit,
  photoPathsForVisit,
  setCelebratedMilestone,
  setVisitStory,
  updateVisit,
  visitedStateCount,
} from "@/db/queries";
import { requireUserId } from "@/lib/auth/server";
import { newMilestone } from "@/lib/milestones";
import { photoStore } from "@/lib/photo-store";
import { todayIn } from "@/lib/dates";
import { checkVisitForm, type VisitFormValues } from "@/lib/visit-form";
import { checkStory } from "@/lib/visit-story";

export type VisitFormState = { errors: string[]; values: VisitFormValues | null };

/** Save the visit form: a new visit (visitId null) or changes to one.
 * OK: go to the visit's state page (with ?milestone=10 when it reached one).
 * Not OK: show the errors and what was typed. */
export async function saveVisit(visitId: number | null, _previous: VisitFormState, form: FormData): Promise<VisitFormState> {
  const userId = await requireUserId();
  const result = checkVisitForm(form, todayIn());
  if (!result.ok) return { errors: result.errors, values: result.values };

  const db = await appDatabase();
  if (visitId === null) {
    await addVisit(db, userId, result.visit);
  } else {
    if (!(await getVisit(db, userId, visitId))) return { errors: ["This visit doesn't exist anymore."], values: null };
    await updateVisit(db, userId, visitId, result.visit);
  }
  refresh(); // the header counter changes too
  // Reached a milestone (10, 25, 50 states) for the first time? Remember it, and
  // let the state page show the celebration (once: it cleans up the address).
  const milestone = newMilestone(await visitedStateCount(db, userId), await celebratedMilestone(db, userId));
  if (milestone) await setCelebratedMilestone(db, userId, milestone);
  redirect(`/states/${result.visit.state}${milestone ? `?milestone=${milestone}` : ""}`);
}

/** Delete a visit (its photos too) and go back to its state's page. */
export async function removeVisit(visitId: number): Promise<void> {
  const userId = await requireUserId();
  const db = await appDatabase();
  const photoFiles = await photoPathsForVisit(db, userId, visitId); // before the rows are gone
  const state = await deleteVisit(db, userId, visitId);
  if (state) await photoStore().delete(photoFiles);
  refresh();
  redirect(state ? `/states/${state}` : "/states");
}

export type StoryFormResult = { ok: true } | { ok: false; error: string };

/** Save (or clear) a visit's story from its visit page. OK: the page shows it
 * again; too long or not my visit: the reason, and nothing changes. */
export async function saveStory(visitId: number, form: FormData): Promise<StoryFormResult> {
  const userId = await requireUserId();
  const result = checkStory(form);
  if (!result.ok) return { ok: false, error: result.error };
  if (!(await setVisitStory(await appDatabase(), userId, visitId, result.story))) {
    return { ok: false, error: "This visit doesn't exist anymore." };
  }
  refresh(); // show the saved story on the page
  return { ok: true };
}

/** Delete one of my photos: its row, and its files in the photo store. */
export async function removePhoto(photoId: number): Promise<void> {
  const userId = await requireUserId();
  const files = await deletePhoto(await appDatabase(), userId, photoId);
  if (files) await photoStore().delete(files);
  refresh();
}
