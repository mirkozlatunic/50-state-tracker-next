// After 5 wrong passwords within a minute, logins pause for a minute.
// Vercel doesn't keep memory between requests, so the wrong tries are kept in
// the database (the login_failures table). Times are in milliseconds.

import { desc, lte } from "drizzle-orm";
import type { Database } from "@/db";
import { loginFailures } from "@/db/schema";

export const MAX_WRONG_PASSWORDS = 5;
export const LOCK_SECONDS = 60;

const LOCK_MS = LOCK_SECONDS * 1000;

/** True if the last 5 wrong passwords came within a minute, and the newest one
 * was less than a minute ago: logins stay paused for a full minute after it. */
export async function isLocked(db: Database, now: number): Promise<boolean> {
  const recent = await db
    .select({ failedAt: loginFailures.failedAt })
    .from(loginFailures)
    .orderBy(desc(loginFailures.failedAt))
    .limit(MAX_WRONG_PASSWORDS);
  if (recent.length < MAX_WRONG_PASSWORDS) return false;
  const newest = recent[0].failedAt;
  const oldest = recent[recent.length - 1].failedAt;
  return newest - oldest < LOCK_MS && now - newest < LOCK_MS;
}

/** Remember one wrong password, and forget tries too old to matter. */
export async function recordFailure(db: Database, now: number): Promise<void> {
  await db.delete(loginFailures).where(lte(loginFailures.failedAt, now - 2 * LOCK_MS));
  await db.insert(loginFailures).values({ failedAt: now });
}

/** Forget all wrong passwords (after a correct login). */
export async function clearFailures(db: Database): Promise<void> {
  await db.delete(loginFailures);
}
