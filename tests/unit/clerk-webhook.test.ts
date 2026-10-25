// Slice 24: Clerk tells the app when an account is deleted, through a webhook
// (POST /api/webhooks/clerk). Only a request signed with the signing secret is
// believed; anything unsigned, wrongly signed, changed or too old is refused
// and changes nothing.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { addVisit, loadVisits } from "@/db/queries";
import { handleClerkWebhook } from "@/lib/account-deletion";
import { localPhotoStore, type PhotoStore } from "@/lib/photo-store";
import { photoFolder } from "@/lib/photos";
import { ME, OTHER, withTestDatabase } from "./db-helpers";
import { signedHeaders, testSigningSecret, userDeletedEvent, webhookRequest } from "./webhook-signing";

const db = withTestDatabase();

let folder: string;
let store: PhotoStore;
let secret: string;
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), "tracker-photos-"));
  store = localPhotoStore(folder);
  secret = testSigningSecret();
  // Both people have a visit and a photo file.
  for (const person of [ME, OTHER]) {
    await addVisit(db(), person, { state: "CO", visitDate: "2024-07-04", note: "", city: null });
    await store.put(`${photoFolder(person)}1/a.jpg`, new Uint8Array([1]));
  }
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));

/** Send `request` to the webhook, with the test secret, or no secret at all
 * (null; undefined wouldn't do, as it means "use the default" here). */
const send = (request: NextRequest, signingSecret: string | null = secret) =>
  handleClerkWebhook(request, { db: db(), store, signingSecret: signingSecret ?? undefined });

/** True when ME's visit and photo file are both still there. */
async function myDataIsThere() {
  return (await loadVisits(db(), ME)).length === 1 && (await store.get(`${photoFolder(ME)}1/a.jpg`)) !== null;
}

describe("a correctly signed 'account deleted' event", () => {
  test("deletes that person's data and answers 200", async () => {
    const body = userDeletedEvent(ME);
    const response = await send(webhookRequest(body, signedHeaders(secret, body)));
    expect(response.status).toBe(200);
    expect(await myDataIsThere()).toBe(false);
  });

  test("leaves everyone else's data alone", async () => {
    const body = userDeletedEvent(ME);
    await send(webhookRequest(body, signedHeaders(secret, body)));
    expect(await loadVisits(db(), OTHER)).toHaveLength(1);
    expect(await store.get(`${photoFolder(OTHER)}1/a.jpg`)).not.toBeNull();
  });

  test("arriving twice is fine", async () => {
    const body = userDeletedEvent(ME);
    expect((await send(webhookRequest(body, signedHeaders(secret, body)))).status).toBe(200);
    expect((await send(webhookRequest(body, signedHeaders(secret, body)))).status).toBe(200);
  });
});

describe("refused, and nothing changes", () => {
  test("no signature at all: 400", async () => {
    const response = await send(webhookRequest(userDeletedEvent(ME)));
    expect(response.status).toBe(400);
    expect(await myDataIsThere()).toBe(true);
  });

  test("signed with a different secret: 400", async () => {
    const body = userDeletedEvent(ME);
    const response = await send(webhookRequest(body, signedHeaders(testSigningSecret(), body)));
    expect(response.status).toBe(400);
    expect(await myDataIsThere()).toBe(true);
  });

  test("a signed event whose body was changed afterwards (another person's id): 400", async () => {
    const headers = signedHeaders(secret, userDeletedEvent(OTHER));
    const response = await send(webhookRequest(userDeletedEvent(ME), headers));
    expect(response.status).toBe(400);
    expect(await myDataIsThere()).toBe(true);
  });

  test("an old signed event sent again later (10 minutes old): 400", async () => {
    const body = userDeletedEvent(ME);
    const response = await send(webhookRequest(body, signedHeaders(secret, body, { secondsAgo: 600 })));
    expect(response.status).toBe(400);
    expect(await myDataIsThere()).toBe(true);
  });

  test("the app has no signing secret set: 500 (Clerk tries again later)", async () => {
    const body = userDeletedEvent(ME);
    const response = await send(webhookRequest(body, signedHeaders(secret, body)), null);
    expect(response.status).toBe(500);
    expect(await myDataIsThere()).toBe(true);
  });
});

describe("other events", () => {
  test("a signed event of another kind (e.g. an account was updated) is ignored: 200", async () => {
    const body = JSON.stringify({ type: "user.updated", object: "event", data: { id: ME, object: "user" } });
    const response = await send(webhookRequest(body, signedHeaders(secret, body)));
    expect(response.status).toBe(200);
    expect(await myDataIsThere()).toBe(true);
  });

  test("an 'account deleted' event without an id deletes nothing: 200", async () => {
    const body = JSON.stringify({ type: "user.deleted", object: "event", data: { object: "user", deleted: true } });
    const response = await send(webhookRequest(body, signedHeaders(secret, body)));
    expect(response.status).toBe(200);
    expect(await myDataIsThere()).toBe(true);
    expect(await loadVisits(db(), OTHER)).toHaveLength(1);
  });
});
