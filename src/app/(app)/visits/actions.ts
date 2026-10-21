"use server";
// Form actions for visits. "use server" means they run on the server when a
// form is sent; Next.js only accepts them from this site. Each one checks the
// login itself, not only proxy.ts.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { appDatabase } from "@/db/app";
import { addVisit, deleteVisit, getVisit, updateVisit } from "@/db/queries";
import { requireLogin } from "@/lib/auth/server";
import { todayIn } from "@/lib/dates";
import { checkVisitForm, type VisitFormValues } from "@/lib/visit-form";

export type VisitFormState = { errors: string[]; values: VisitFormValues | null };

/** Save the visit form: a new visit (visitId null) or changes to one.
 * OK: go to the visit's state page. Not OK: show the errors and what was typed. */
export async function saveVisit(visitId: number | null, _previous: VisitFormState, form: FormData): Promise<VisitFormState> {
  await requireLogin();
  const result = checkVisitForm(form, todayIn());
  if (!result.ok) return { errors: result.errors, values: result.values };

  const db = await appDatabase();
  if (visitId === null) {
    await addVisit(db, result.visit);
  } else {
    if (!(await getVisit(db, visitId))) return { errors: ["This visit doesn't exist anymore."], values: null };
    await updateVisit(db, visitId, result.visit);
  }
  refresh(); // the header counter changes too
  redirect(`/states/${result.visit.state}`);
}

/** Delete a visit and go back to its state's page. */
export async function removeVisit(visitId: number): Promise<void> {
  await requireLogin();
  const state = await deleteVisit(await appDatabase(), visitId);
  refresh();
  redirect(state ? `/states/${state}` : "/states");
}
