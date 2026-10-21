// Slice 2: the password is never stored, only a "hash" — a scrambled version
// that can be checked against but not turned back into the password.
import { describe, expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("the password hash", () => {
  test("doesn't contain the password", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).not.toContain("correct horse");
  });

  test("the right password matches, a wrong one doesn't", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("Correct horse", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  test("hashing the same password twice gives different hashes (a random salt)", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  test("a damaged or empty hash never matches", async () => {
    for (const broken of ["", "nonsense", "scrypt:1:2:3", "pbkdf2:sha256:600000$abc$def"]) {
      expect(await verifyPassword("anything", broken)).toBe(false);
    }
  });

  test("the hash has no $ or spaces, so it survives .env files and Vercel's settings", async () => {
    expect(await hashPassword("p@ss $word")).toMatch(/^[A-Za-z0-9:_-]+$/);
  });
});

describe("the quick (synchronous) version, for scripts and test setup", () => {
  test("makes hashes the normal check accepts", async () => {
    const { hashPasswordSync } = await import("@/lib/auth/password");
    expect(await verifyPassword("from a script", hashPasswordSync("from a script"))).toBe(true);
  });
});
