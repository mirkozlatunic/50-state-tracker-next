// Deleting an account's data (slice 24). When someone deletes their account,
// Clerk calls our webhook (POST /api/webhooks/clerk) with a "user.deleted"
// event, and we delete everything they stored here. A "webhook" is an address
// another service calls to tell us something happened.

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import type { Database } from "@/db";
import { deleteUserData } from "@/db/queries";
import type { PhotoStore } from "@/lib/photo-store";
import { photoFolder } from "@/lib/photos";

/** Delete everything `userId` stored here: their rows first (all at once), then
 * their whole photo folder, which also catches files no row points at. If the
 * files fail, the webhook answers with an error and Clerk sends the event again;
 * the rows are already gone by then, so running it twice is fine. */
export async function deleteAccount(db: Database, store: PhotoStore, userId: string): Promise<void> {
  await deleteUserData(db, userId);
  await store.deleteFolder(photoFolder(userId));
}

/** What the webhook needs: the database, the photo store, and the signing
 * secret from Clerk's dashboard (undefined when it isn't set). */
export type WebhookDeps = { db: Database; store: PhotoStore; signingSecret: string | undefined };

// The three headers Clerk signs every webhook with (through Svix).
const SIGNATURE_HEADERS = ["svix-id", "svix-timestamp", "svix-signature"];

/** Handle one webhook request from Clerk. Only a request signed with the
 * signing secret is believed: anything unsigned, wrongly signed, changed after
 * signing, or more than 5 minutes old gets 400 and changes nothing. */
export async function handleClerkWebhook(request: NextRequest, { db, store, signingSecret }: WebhookDeps): Promise<Response> {
  if (SIGNATURE_HEADERS.some((name) => !request.headers.get(name))) return new Response("Not signed", { status: 400 });
  if (!signingSecret) {
    // Our own setting is missing (see docs): 500, so Clerk keeps the event and tries again later.
    console.error("CLERK_WEBHOOK_SIGNING_SECRET isn't set; the account-deletion webhook can't check signatures.");
    return new Response("Not set up", { status: 500 });
  }

  let event;
  try {
    // Checks the signature and the time; throws if either is wrong.
    event = await verifyWebhook(request, { signingSecret });
  } catch {
    return new Response("Wrong signature", { status: 400 });
  }

  // Only "an account was deleted" matters here; other events are fine to ignore.
  if (event.type === "user.deleted" && typeof event.data.id === "string" && event.data.id) {
    await deleteAccount(db, store, event.data.id);
  }
  return new Response("OK", { status: 200 });
}
