"use server";
// Form actions for trips. Each one checks who's signed in itself (and only
// touches their own trips), not only proxy.ts.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { appDatabase } from "@/db/app";
import { addTrip, deleteTrip, getTrip, setTripDates, updateTrip } from "@/db/queries";
import { requireUserId } from "@/lib/auth/server";
import { todayIn } from "@/lib/dates";
import { planMove } from "@/lib/rules";
import { checkTripForm, returnPath, type TripFormValues } from "@/lib/trip-form";

export type TripFormState = { errors: string[]; values: TripFormValues | null };

/** Save the trip form: a new trip (tripId null) or changes to one. OK: go back
 * to the trips page (or the years page, if the form came from there). */
export async function saveTrip(tripId: number | null, _previous: TripFormState, form: FormData): Promise<TripFormState> {
  const userId = await requireUserId();
  const db = await appDatabase();
  const existing = tripId === null ? null : await getTrip(db, userId, tripId);
  if (tripId !== null && !existing) return { errors: ["This trip doesn't exist anymore."], values: null };

  const result = checkTripForm(form, todayIn(), existing?.startDate);
  if (!result.ok) return { errors: result.errors, values: result.values };

  if (tripId === null) await addTrip(db, userId, result.trip);
  else await updateTrip(db, userId, tripId, result.trip);
  refresh();
  redirect(returnPath(String(form.get("return_to") ?? "")));
}

/** Delete a trip and go back to where the Delete button was. */
export async function removeTrip(tripId: number, returnTo: string): Promise<void> {
  const userId = await requireUserId();
  await deleteTrip(await appDatabase(), userId, tripId);
  refresh();
  redirect(returnPath(returnTo));
}

/** Move a trip to another year (the "Move to" menu, or dropping its card on a
 * year): same month, day and length. Returns the reason if the move breaks a
 * trip rule; nothing changes then. */
export async function moveTrip(tripId: number, year: string): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  const db = await appDatabase();
  const trip = await getTrip(db, userId, tripId);
  if (!trip) return { error: "This trip doesn't exist anymore." };

  const plan = planMove(trip, year, todayIn());
  if (plan.kind === "error") return { error: plan.message };
  if (plan.kind === "move") {
    await setTripDates(db, userId, tripId, plan.startDate, plan.endDate);
    refresh();
  }
  return { error: null };
}
