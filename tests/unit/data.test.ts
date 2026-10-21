// Slice 1: the fixed data — the 50 states, the Census regions and the map outlines.
import { describe, expect, test } from "vitest";
import { STATES, STATE_CODES, STATE_NAMES } from "@/lib/data/states";
import { REGIONS } from "@/lib/data/regions";
import { MAP_HEIGHT, MAP_WIDTH, STATE_PATHS } from "@/lib/data/map";
import { EXPECTED_STATES } from "./expected";

describe("the 50 states", () => {
  test("there are exactly 50", () => {
    expect(STATES).toHaveLength(50);
    expect(STATE_CODES.size).toBe(50);
  });

  test("they have their official names and codes", () => {
    expect(Object.fromEntries(STATES)).toEqual(EXPECTED_STATES);
    expect(STATE_NAMES.CO).toBe("Colorado");
  });

  test("Washington, D.C. is not a state", () => {
    expect(STATE_CODES.has("DC")).toBe(false);
  });
});

describe("the Census regions", () => {
  test("there are four, in the Census order", () => {
    expect(REGIONS.map((region) => region.name)).toEqual(["Northeast", "Midwest", "South", "West"]);
  });

  test("they cover all 50 states, each exactly once", () => {
    const codes = REGIONS.flatMap((region) => region.codes);
    expect(codes).toHaveLength(50);
    expect(new Set(codes)).toEqual(STATE_CODES);
  });
});

describe("the map outlines", () => {
  test("there is one outline per state, and no others", () => {
    expect(new Set(Object.keys(STATE_PATHS))).toEqual(STATE_CODES);
  });

  test("the drawing keeps the Flask app's size", () => {
    expect([MAP_WIDTH, MAP_HEIGHT]).toEqual([959, 593]);
  });
});
