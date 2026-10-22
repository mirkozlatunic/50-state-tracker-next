// Slice 6: small helpers for the map page.
import { describe, expect, test } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH } from "@/lib/data/map";
import { dotDetails, dotPosition, readMapYear } from "@/lib/map-view";
import type { CityDot } from "@/lib/progress";

/** A city dot with any field replaced. */
function dot(changes: Partial<CityDot> = {}): CityDot {
  return { name: "Denver", state: "CO", x: 331.6, y: 257.9, kind: "visited", visitDates: [], trips: [], ...changes };
}

describe("a dot's details", () => {
  test("a visited city lists its visit dates", () => {
    expect(dotDetails(dot({ visitDates: ["2024-07-04", "2025-03-01"] }))).toBe("Denver, CO · visited 2024-07-04, 2025-03-01");
  });

  test("an upcoming city lists its trips with their start dates", () => {
    const upcoming = dot({
      kind: "upcoming",
      trips: [
        { name: "Four Corners weekend", startDate: "2026-10-30" },
        { name: "Ski trip", startDate: "2027-01-10" },
      ],
    });
    expect(dotDetails(upcoming)).toBe("Denver, CO · upcoming: Four Corners weekend (2026-10-30); Ski trip (2027-01-10)");
  });

  test("a city that's both shows the visits first, then the trips", () => {
    const both = dot({ kind: "upcoming", visitDates: ["2024-07-04"], trips: [{ name: "Back again", startDate: "2026-11-01" }] });
    expect(dotDetails(both)).toBe("Denver, CO · visited 2024-07-04 · upcoming: Back again (2026-11-01)");
  });
});

describe("where a dot sits over the map", () => {
  test("as a share of the map's width and height, so it stays put at any size", () => {
    expect(dotPosition(0, 0)).toEqual({ left: "0%", top: "0%" });
    expect(dotPosition(MAP_WIDTH, MAP_HEIGHT)).toEqual({ left: "100%", top: "100%" });
    expect(dotPosition(MAP_WIDTH / 2, MAP_HEIGHT / 4)).toEqual({ left: "50%", top: "25%" });
  });
});

describe("the map's ?year= filter", () => {
  test("a four-digit year is used; anything else shows all upcoming trips", () => {
    expect(readMapYear("2027")).toBe(2027);
    for (const bad of ["banana", "", undefined, "27", "20270"]) expect(readMapYear(bad)).toBeNull();
  });
});
