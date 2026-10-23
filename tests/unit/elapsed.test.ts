// Slice 12: the pixel loader's timer ("1.2s", "1m 15.4s"), counted in tenths of a second.
import { describe, expect, test } from "vitest";
import { formatElapsed } from "@/lib/elapsed";

describe("the loader's timer", () => {
  test("starts at 0.0s", () => {
    expect(formatElapsed(0)).toBe("0.0s");
  });

  test("shows seconds with one decimal under a minute", () => {
    expect(formatElapsed(12)).toBe("1.2s");
    expect(formatElapsed(599)).toBe("59.9s");
  });

  test("adds minutes from one minute on", () => {
    expect(formatElapsed(600)).toBe("1m 0.0s");
    expect(formatElapsed(754)).toBe("1m 15.4s");
    expect(formatElapsed(36_000)).toBe("60m 0.0s");
  });

  test("never shows rounding errors like 0.30000000000000004", () => {
    for (let tenths = 0; tenths < 1200; tenths++) expect(formatElapsed(tenths)).toMatch(/^(\d+m )?\d+\.\ds$/);
  });
});
