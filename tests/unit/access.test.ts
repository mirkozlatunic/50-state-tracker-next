// Slice 2: which pages open without logging in, and where you go after logging in.
import { describe, expect, test } from "vitest";
import { decideAccess, safeNext } from "@/lib/auth/access";
import { SESSION_DAYS, sessionOptions } from "@/lib/auth/session";

describe("who may open a page", () => {
  const loggedOut = { loggedIn: false, setUp: true, search: "" };

  test.each(["/", "/states", "/trips/3/edit", "/backup"])("logged out, %s goes to the login page", (pathname) => {
    expect(decideAccess({ ...loggedOut, pathname })).toEqual({
      kind: "redirect",
      to: `/login?next=${encodeURIComponent(pathname)}`,
    });
  });

  test("the address after ? is kept, so you land on the same view", () => {
    expect(decideAccess({ ...loggedOut, pathname: "/map", search: "?year=2027" })).toEqual({
      kind: "redirect",
      to: `/login?next=${encodeURIComponent("/map?year=2027")}`,
    });
  });

  test.each(["/login", "/manifest.webmanifest", "/icons/icon-180.png", "/favicon.ico"])(
    "logged out, %s still opens (the login page, icons and manifest)",
    (pathname) => {
      expect(decideAccess({ ...loggedOut, pathname })).toEqual({ kind: "allow" });
    },
  );

  test("a form action goes on to its own login check, which sends you to the login page properly", () => {
    expect(decideAccess({ ...loggedOut, pathname: "/visits/new", serverAction: true })).toEqual({ kind: "allow" });
  });

  test("without a password set, even form actions are stopped", () => {
    expect(decideAccess({ loggedIn: false, setUp: false, pathname: "/visits/new", search: "", serverAction: true })).toEqual({
      kind: "setup",
    });
  });

  test("logged in, every page opens: one login is enough", () => {
    for (const pathname of ["/", "/states", "/trips/3/edit", "/login"]) {
      expect(decideAccess({ loggedIn: true, setUp: true, pathname, search: "" })).toEqual({ kind: "allow" });
    }
  });

  test("without a password set, every page explains how to set one", () => {
    for (const pathname of ["/", "/login", "/states"]) {
      expect(decideAccess({ loggedIn: false, setUp: false, pathname, search: "" })).toEqual({ kind: "setup" });
    }
  });

  test("without a password set, the icons and manifest still load", () => {
    expect(decideAccess({ loggedIn: false, setUp: false, pathname: "/manifest.webmanifest", search: "" })).toEqual({
      kind: "allow",
    });
  });
});

describe("where you go after logging in", () => {
  test("back to the page you wanted", () => {
    expect(safeNext("/years")).toBe("/years");
    expect(safeNext("/map?year=2027")).toBe("/map?year=2027");
  });

  test("only pages of this app; anything else goes home", () => {
    for (const target of ["", null, "https://example.com", "//example.com", "/\\example.com", "javascript:alert(1)"]) {
      expect(safeNext(target)).toBe("/");
    }
  });
});

describe("the login cookie", () => {
  const options = sessionOptions({ secret: "x".repeat(32), secure: true });

  test("lasts 30 days", () => {
    expect(SESSION_DAYS).toBe(30);
    expect(options.ttl).toBe(30 * 24 * 60 * 60);
  });

  test("can't be read by scripts, is only sent over https, and not from other sites' forms", () => {
    expect(options.cookieOptions).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
  });

  test("on the computer (plain http) it isn't https-only, or it wouldn't work", () => {
    expect(sessionOptions({ secret: "x".repeat(32), secure: false }).cookieOptions?.secure).toBe(false);
  });

  test("a short secret is refused", () => {
    expect(() => sessionOptions({ secret: "too short", secure: true })).toThrow();
  });
});
