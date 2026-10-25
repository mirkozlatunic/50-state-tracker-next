// Slice 24: signing test requests the way Clerk signs its webhooks (Clerk uses
// Svix, which follows the "Standard Webhooks" scheme): an HMAC-SHA256 of
// "<id>.<timestamp>.<body>", keyed with the secret, sent in three headers.
// An HMAC is a signature only someone with the secret can make.
import { createHmac, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";

/** A made-up signing secret in Clerk's format ("whsec_" + base64), new each
 * time, so no real secret is ever in a file. */
export function testSigningSecret(): string {
  return `whsec_${randomBytes(24).toString("base64")}`;
}

/** The three headers Clerk sends with `body`, signed with `secret`.
 * `secondsAgo`: pretend it was sent that long ago (for the too-old check). */
export function signedHeaders(secret: string, body: string, { id = "msg_test_1", secondsAgo = 0 } = {}): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000) - secondsAgo);
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` };
}

/** A POST request to the webhook with this body and headers (a NextRequest,
 * the kind the route gets from Next.js). */
export function webhookRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

/** The body Clerk sends when an account is deleted. */
export function userDeletedEvent(userId: string): string {
  return JSON.stringify({ type: "user.deleted", object: "event", data: { id: userId, object: "user", deleted: true } });
}
