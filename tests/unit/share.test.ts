// Slice 20: share codes. A shared map's link is /share/<code>; the code is long
// and random, so nobody can guess someone's link.
import { describe, expect, test } from "vitest";
import { isShareId, newShareId } from "@/lib/share";

describe("share codes", () => {
  test("are 22 letters, digits, - or _ (128 random bits)", () => {
    expect(newShareId()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  test("are different every time", () => {
    const codes = new Set(Array.from({ length: 1000 }, newShareId));
    expect(codes.size).toBe(1000);
  });

  test("anything else isn't a share code", () => {
    expect(isShareId(newShareId())).toBe(true);
    for (const bad of ["", "short", "a".repeat(21), "a".repeat(23), "a".repeat(21) + "!", "../../etc/passwd....."]) {
      expect(isShareId(bad), bad).toBe(false);
    }
  });
});
