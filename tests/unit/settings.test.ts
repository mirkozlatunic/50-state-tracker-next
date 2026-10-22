// The login cookie is https-only online. Only a test server without https
// (GitHub's browser tests) may switch that off, and only by saying so exactly.
import { describe, expect, test } from "vitest";
import { secureCookies } from "@/lib/settings";

describe("https-only login cookie", () => {
  test("is on in production by default", () => {
    expect(secureCookies({ NODE_ENV: "production" })).toBe(true);
  });

  test("is off on the computer's development server (plain http)", () => {
    expect(secureCookies({ NODE_ENV: "development" })).toBe(false);
  });

  test("a test server without https can switch it off with SESSION_COOKIE_SECURE=false", () => {
    expect(secureCookies({ NODE_ENV: "production", SESSION_COOKIE_SECURE: "false" })).toBe(false);
  });

  test("anything else keeps it on", () => {
    for (const value of ["true", "0", "no", "", "False "]) {
      expect(secureCookies({ NODE_ENV: "production", SESSION_COOKIE_SECURE: value }), value).toBe(true);
    }
  });
});
