"use server";
// Form actions for trips. Each one checks the login itself, not only proxy.ts.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { appDatabase } from "@/db/app";
import { addTrip, deleteTrip, getTrip, updateTrip } from "@/db/queries";
import { requireLogin } from "@/lib/auth/server";
import { todayIn } from "@/lib/dates";
import { checkTripForm, returnPath, type TripFormValues } from "@/lib/trip-form";

export type TripFormState = { errors: string[]; values: TripFormValues | null };

/** Save the trip form: a new trip (tripId null) or changes to one. OK: go back
 * to the trips page (or the years page, if the form came from there). */
export async function saveTrip(tripId: number | null, _previous: TripFormState, form: FormData): Promise<TripFormState> {
  await requireLogin();
  const db = await appDatabase();
  const existing = tripId === null ? null : await getTrip(db, tripId);
  if (tripId !== null && !existing) return { errors: ["This trip doesn't exist anymore."], values: null };

  const result = checkTripForm(form, todayIn(), existing?.startDate);
  if (!result.ok) return { errors: result.errors, values: result.values };

  if (tripId === null) await addTrip(db, result.trip);
  else await updateTrip(db, tripId, result.trip);
  refresh();
  redirect(returnPath(String(form.get("return_to") ?? "")));
}

/** Delete a trip and go back to where the Delete button was. */
export async function removeTrip(tripId: number, returnTo: string): Promise<void> {
  await requireLogin();
  await deleteTrip(await appDatabase(), tripId);
  refresh();
  redirect(returnPath(returnTo));
}
