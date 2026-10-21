// The login, as used by pages and form actions on the server.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { secureCookies, sessionSecret } from "@/lib/settings";
import { sessionOptions, type SessionData } from "./session";

/** This browser's login session (read from, and saved to, its cookie). */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions({ secret: sessionSecret(), secure: secureCookies() }));
}

/** Stop unless this browser is logged in. Every form action that changes data
 * calls this itself, instead of only relying on proxy.ts. */
export async function requireLogin(): Promise<void> {
  if (!(await getSession()).loggedIn) redirect("/login");
}
