// Runs before every page (Next.js "proxy", formerly "middleware"): logged out,
// pages go to /login; without a password set, they explain how to set one.
// Each form action also checks the login itself (see requireLogin).

import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { decideAccess } from "@/lib/auth/access";
import { checkStatePath } from "@/lib/routes";
import { COOKIE_NAME, sessionOptions, type SessionData } from "@/lib/auth/session";
import { isSetUp, secureCookies, sessionSecret } from "@/lib/settings";

export async function proxy(request: NextRequest) {
  const setUp = isSetUp();
  let loggedIn = false;
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (setUp && cookie) {
    const { password, ttl } = sessionOptions({ secret: sessionSecret(), secure: secureCookies() });
    // unsealData gives back {} for a cookie that's fake, damaged or too old.
    const data = await unsealData<SessionData>(cookie, { password, ttl });
    loggedIn = data.loggedIn === true;
  }

  const { pathname, search } = request.nextUrl;
  // Form actions are sent with a "Next-Action" header naming the action.
  const serverAction = request.method === "POST" && request.headers.has("next-action");
  const access = decideAccess({ pathname, search, loggedIn, setUp, serverAction });
  if (access.kind === "redirect") return NextResponse.redirect(new URL(access.to, request.url));
  if (access.kind === "setup") return NextResponse.rewrite(new URL("/setup", request.url), { status: 503 });

  const path = checkStatePath(pathname);
  if (path.kind === "redirect") return NextResponse.redirect(new URL(path.to, request.url));
  // An address no page answers: Next.js shows the not-found page with a 404.
  if (path.kind === "not-found") return NextResponse.rewrite(new URL("/not-found", request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js's own build files (scripts, styles, images).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
