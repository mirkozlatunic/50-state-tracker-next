"use server";
// Form actions for sharing my map (slice 20). Each one checks who's signed in
// itself, and only changes that person's own sharing.

import { refresh } from "next/cache";
import { appDatabase } from "@/db/app";
import { startSharing, stopSharing } from "@/db/queries";
import { requireUserId } from "@/lib/auth/server";

/** Share my map, with a new link (an old link stops working). */
export async function shareMap(): Promise<void> {
  const userId = await requireUserId();
  await startSharing(await appDatabase(), userId);
  refresh();
}

/** Stop sharing my map: its link stops working. */
export async function stopSharingMap(): Promise<void> {
  const userId = await requireUserId();
  await stopSharing(await appDatabase(), userId);
  refresh();
}
