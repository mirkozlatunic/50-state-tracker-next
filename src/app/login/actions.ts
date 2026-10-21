"use server";
// Form actions for logging in and out. "use server" means these run on the
// server when the form is sent; Next.js only accepts them from this site.

import { redirect } from "next/navigation";
import { appDatabase } from "@/db/app";
import { safeNext } from "@/lib/auth/access";
import { clearFailures, isLocked, recordFailure } from "@/lib/auth/lockout";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/server";
import { passwordHash } from "@/lib/settings";

export type LoginState = { error: string | null };

/** Check the password. Right: log in and go back to the page you wanted. Wrong: say so. */
export async function logIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const db = await appDatabase();
  const now = Date.now();
  if (await isLocked(db, now)) return { error: "Too many wrong passwords. Try again in a minute." };

  if (!(await verifyPassword(String(form.get("password") ?? ""), passwordHash()))) {
    await recordFailure(db, now);
    return { error: "That password isn't right." };
  }

  await clearFailures(db);
  const session = await getSession();
  session.loggedIn = true;
  await session.save();
  redirect(safeNext(String(form.get("next") ?? "")));
}

/** Log out: forget this browser's session. */
export async function logOut(): Promise<void> {
  (await getSession()).destroy();
  redirect("/login");
}
