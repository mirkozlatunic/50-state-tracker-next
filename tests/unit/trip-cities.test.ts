// Slice 28: on a planned trip, each city I've already visited shows its photo
// (if it has one) and "Visited <month year>" for my most recent visit there.
// Cities I haven't visited get nothing extra.
import { describe, expect, test } from "vitest";
import { monthYear, visitedTripCities, type CityPhoto } from "@/lib/city-photos";
import type { Visit } from "@/lib/progress";

/** A trip with these cities (only the cities matter here). */
const trip = (...cities: [string, string][]) => ({ cities: cities.map(([name, state]) => ({ name, state })) });
const visit = (state: string, visitDate: string, city: string | null): Visit => ({ state, visitDate, city });
const NO_PHOTOS = new Map<string, CityPhoto>();

describe("visitedTripCities", () => {
  test("a trip city I've visited gets its photo and my most recent visit's date", () => {
    const visits = [visit("CO", "2023-05-01", "Denver"), visit("CO", "2025-03-01", "Denver"), visit("CO", "2024-07-04", "Denver")];
    const photos = new Map([["CO|Denver", { photoId: 7, visitDate: "2024-07-04" }]]);

    expect(visitedTripCities([trip(["Denver", "CO"])], visits, photos)).toEqual({
      "CO|Denver": { lastVisit: "2025-03-01", photo: { photoId: 7, visitDate: "2024-07-04" } },
    });
  });

  test("a visited trip city without photos still gets the date, with no photo", () => {
    const visits = [visit("CO", "2024-09-01", "Grand Junction")];

    expect(visitedTripCities([trip(["Grand Junction", "CO"])], visits, NO_PHOTOS)).toEqual({
      "CO|Grand Junction": { lastVisit: "2024-09-01", photo: null },
    });
  });

  test("a trip city I haven't visited gets nothing", () => {
    const visits = [visit("CO", "2024-07-04", "Denver")];

    expect(visitedTripCities([trip(["Boulder", "CO"])], visits, NO_PHOTOS)).toEqual({});
  });

  test("a city of the same name in another state doesn't count", () => {
    const visits = [visit("OR", "2024-07-04", "Portland")];
    const photos = new Map([["OR|Portland", { photoId: 3, visitDate: "2024-07-04" }]]);

    expect(visitedTripCities([trip(["Portland", "ME"])], visits, photos)).toEqual({});
  });

  test("a visit without a city doesn't make the state's trip cities visited", () => {
    const visits = [visit("CO", "2024-07-04", null)];

    expect(visitedTripCities([trip(["Denver", "CO"])], visits, NO_PHOTOS)).toEqual({});
  });

  test("only the trips' own cities are included, from all the trips given", () => {
    const visits = [visit("CO", "2024-07-04", "Denver"), visit("OR", "2024-08-01", "Portland"), visit("UT", "2022-01-01", "Moab")];

    expect(Object.keys(visitedTripCities([trip(["Denver", "CO"]), trip(["Portland", "OR"])], visits, NO_PHOTOS)).sort()).toEqual([
      "CO|Denver",
      "OR|Portland",
    ]);
  });
});

describe("monthYear", () => {
  test("turns a date into its month and year, in English", () => {
    expect(monthYear("2024-07-04")).toBe("July 2024");
    expect(monthYear("2025-01-31")).toBe("January 2025");
    expect(monthYear("2023-12-01")).toBe("December 2023");
  });
});
