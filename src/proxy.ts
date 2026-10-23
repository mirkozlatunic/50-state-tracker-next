// Runs before every page (Next.js "proxy", formerly "middleware"). Clerk's
// clerkMiddleware reads the sign-in cookie; signed out, every page except the
// public ones (src/lib/auth/public-routes.ts) goes to the sign-in page.
// Each page and form action also checks who's signed in itself (requireUserId).

import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { isPublicPath } from "@/lib/auth/public-routes";
import { checkStatePath } from "@/lib/routes";

export default clerkMiddleware(
  async (auth, request) => {
    const { pathname } = request.nextUrl;
    // Form actions are sent with a "Next-Action" header naming the action. Each
    // one checks who's signed in itself (requireUserId), and its trip to
    // /sign-in is one the form understands; a redirect from here isn't.
    const serverAction = request.method === "POST" && request.headers.has("next-action");
    // auth.protect() sends a signed-out visitor to /sign-in, remembering this page.
    if (!isPublicPath(pathname) && !serverAction) await auth.protect();

    const path = checkStatePath(pathname);
    if (path.kind === "redirect") return NextResponse.redirect(new URL(path.to, request.url));
    // An address no page answers: Next.js shows the not-found page with a 404.
    if (path.kind === "not-found") return NextResponse.rewrite(new URL("/not-found", request.url));
    return NextResponse.next();
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  // Everything except Next.js's own build files (scripts, styles, images).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
