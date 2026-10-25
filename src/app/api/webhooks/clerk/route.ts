// POST /api/webhooks/clerk (slice 24): Clerk tells us an account was deleted,
// and we delete that person's data (see src/lib/account-deletion.ts).
// It's open without signing in (Clerk can't sign in); the signature check
// protects it instead. The signing secret is CLERK_WEBHOOK_SIGNING_SECRET
// (Vercel's settings, and .env.local on the computer).

import { connection, type NextRequest } from "next/server";
import { appDatabase } from "@/db/app";
import { handleClerkWebhook } from "@/lib/account-deletion";
import { photoStore } from "@/lib/photo-store";

export async function POST(request: NextRequest) {
  await connection();
  return handleClerkWebhook(request, {
    db: await appDatabase(),
    store: photoStore(),
    signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
  });
}
