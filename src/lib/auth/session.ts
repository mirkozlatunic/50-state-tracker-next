// The login cookie. iron-session keeps a small signed and encrypted cookie in
// the browser that says "logged in"; nobody can read or fake it without the
// session secret.

import type { SessionOptions } from "iron-session";

export const SESSION_DAYS = 30;
export const COOKIE_NAME = "tracker_session";

/** What's inside the cookie. */
export type SessionData = { loggedIn?: boolean };

/** The cookie settings. `secure` (https only) is on for the online site, off on the computer. */
export function sessionOptions({ secret, secure }: { secret: string; secure: boolean }): SessionOptions {
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return {
    password: secret,
    cookieName: COOKIE_NAME,
    ttl: SESSION_DAYS * 24 * 60 * 60, // in seconds; the cookie lasts as long
    cookieOptions: {
      httpOnly: true, // scripts on the page can't read it
      secure,
      sameSite: "lax", // not sent along when another site posts a form here
      path: "/",
    },
  };
}
