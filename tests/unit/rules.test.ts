// Slice 1: the rules a visit or a trip must follow (the same checks as the
// Flask app's validation tests). Dates are "YYYY-MM-DD" text, like in the database.
import { describe, expect, test } from "vitest";
import { planMove, validateTrip, validateTripCities, validateVisit } from "@/lib/rules";

// A fixed "today", so the tests give the same result whatever day they run.
const TODAY = "2026-10-20";

/** A valid trip, with any field replaced, so each test only shows what it changes. */
function trip(changes: Partial<Parameters<typeof validateTrip>[0]> = {}) {
  return { name: "Weekend", startDate: "2026-11-06", endDate: "2026-11-08", states: ["AZ", "UT"], ...changes };
}

describe("a visit", () => {
  test("a valid visit has no errors", () => {
    expect(validateVisit({ state: "CA", visitDate: "2024-07-04" }, TODAY)).toEqual([]);
  });

  test("today is allowed", () => {
    expect(validateVisit({ state: "CA", visitDate: "2026-10-20" }, TODAY)).toEqual([]);
  });

  test("a date in the future is rejected", () => {
    expect(validateVisit({ state: "CA", visitDate: "2026-10-21" }, TODAY)).toContain(
      "The visit date can't be in the future.",
    );
  });

  test("a missing date is rejected", () => {
    expect(validateVisit({ state: "CA", visitDate: "" }, TODAY)).toContain("Please enter a visit date.");
  });

  test("an impossible date (February 30th) is rejected", () => {
    expect(validateVisit({ state: "CA", visitDate: "2024-02-30" }, TODAY)).toContain("Please enter a real date.");
  });

  test("D.C., a typo or no state is rejected", () => {
    for (const state of ["DC", "XX", ""]) {
      expect(validateVisit({ state, visitDate: "2024-07-04" }, TODAY)).toContain(
        "Please choose one of the 50 states.",
      );
    }
  });

  test("the city is optional", () => {
    expect(validateVisit({ state: "CO", visitDate: "2024-07-04", city: "" }, TODAY)).toEqual([]);
  });

  test("the city must be in the chosen state", () => {
    expect(validateVisit({ state: "CO", visitDate: "2024-07-04", city: "Denver" }, TODAY)).toEqual([]);
    expect(validateVisit({ state: "CO", visitDate: "2024-07-04", city: "Denvr" }, TODAY)).toContain(
      "We couldn't find “Denvr” in Colorado.",
    );
    expect(validateVisit({ state: "CO", visitDate: "2024-07-04", city: "Seattle" }, TODAY)).toContain(
      "We couldn't find “Seattle” in Colorado.",
    );
  });
});

describe("a planned trip", () => {
  test("a valid trip has no errors", () => {
    expect(validateTrip(trip(), TODAY)).toEqual([]);
  });

  test("starting tomorrow is allowed", () => {
    expect(validateTrip(trip({ startDate: "2026-10-21", endDate: "2026-10-22" }), TODAY)).toEqual([]);
  });

  test("starting today or in the past is rejected", () => {
    for (const startDate of ["2026-10-20", "2026-01-01"]) {
      expect(validateTrip(trip({ startDate, endDate: "2026-10-22" }), TODAY)).toContain(
        "A planned trip must start in the future.",
      );
    }
  });

  test("ending before the start is rejected", () => {
    expect(validateTrip(trip({ startDate: "2026-11-08", endDate: "2026-11-06" }), TODAY)).toContain(
      "The end date can't be before the start date.",
    );
  });

  test("a one-day trip is allowed", () => {
    expect(validateTrip(trip({ startDate: "2026-11-06", endDate: "2026-11-06" }), TODAY)).toEqual([]);
  });

  test("it needs a name", () => {
    expect(validateTrip(trip({ name: "   " }), TODAY)).toContain("Please enter a trip name.");
  });

  test("it needs both dates", () => {
    const errors = validateTrip(trip({ startDate: "", endDate: "" }), TODAY);
    expect(errors).toContain("Please enter a start date.");
    expect(errors).toContain("Please enter an end date.");
  });

  test("impossible dates are rejected", () => {
    const errors = validateTrip(trip({ startDate: "2027-02-30", endDate: "2027-02-31" }), TODAY);
    expect(errors).toContain("Please enter a real start date.");
    expect(errors).toContain("Please enter a real end date.");
  });

  test("it needs at least one state", () => {
    expect(validateTrip(trip({ states: [] }), TODAY)).toContain("Please choose at least one state.");
  });

  test("D.C. can't be part of a trip", () => {
    expect(validateTrip(trip({ states: ["VA", "DC"] }), TODAY)).toContain("Please choose only from the 50 states.");
  });

  test("a state you've already visited can be planned (nothing checks visits)", () => {
    expect(validateTrip(trip({ states: ["CA"] }), TODAY)).toEqual([]);
  });
});

describe("editing a trip and its start date", () => {
  test("may keep a start date that has passed (a trip in progress can be renamed)", () => {
    const edit = trip({ startDate: "2026-10-19", endDate: "2026-10-22", keepStart: "2026-10-19" });
    expect(validateTrip(edit, TODAY)).toEqual([]);
  });

  test("may not move the start to another past date", () => {
    const edit = trip({ startDate: "2026-10-18", endDate: "2026-10-22", keepStart: "2026-10-19" });
    expect(validateTrip(edit, TODAY)).toContain("A planned trip must start in the future.");
  });

  test("may move the start into the future", () => {
    const edit = trip({ startDate: "2026-11-01", endDate: "2026-11-02", keepStart: "2026-10-19" });
    expect(validateTrip(edit, TODAY)).toEqual([]);
  });

  test("a kept start date still needs the end not before it", () => {
    const edit = trip({ startDate: "2026-10-19", endDate: "2026-10-18", keepStart: "2026-10-19" });
    expect(validateTrip(edit, TODAY)).toContain("The end date can't be before the start date.");
  });
});

describe("a trip's cities", () => {
  test("are read as “City, ST”, with the official spelling, blanks skipped", () => {
    expect(validateTripCities(["Denver, CO", " santa fe , nm ", ""], ["CO", "NM"])).toEqual({
      errors: [],
      cities: [{ name: "Denver", state: "CO" }, { name: "Santa Fe", state: "NM" }],
    });
  });

  test("a city must be written with its state", () => {
    expect(validateTripCities(["Denver"], ["CO"]).errors).toContain(
      "Please write each city as “City, ST”, for example “Denver, CO”.",
    );
  });

  test("a city must exist", () => {
    expect(validateTripCities(["Denvr, CO"], ["CO"]).errors).toContain("We couldn't find “Denvr, CO”.");
  });

  test("a city must be in one of the trip's states", () => {
    expect(validateTripCities(["Seattle, WA"], ["CO", "NM"]).errors).toContain(
      "Seattle, WA isn't in this trip's states.",
    );
  });

  test("a city written twice counts once", () => {
    expect(validateTripCities(["Denver, CO", "denver, co"], ["CO"])).toEqual({
      errors: [],
      cities: [{ name: "Denver", state: "CO" }],
    });
  });

  test("a city splits from its state at the last comma", () => {
    expect(validateTripCities(["Winston-Salem, NC"], ["NC"]).cities).toEqual([{ name: "Winston-Salem", state: "NC" }]);
    expect(validateTripCities(["Islamorada, Village of Islands, FL"], ["FL"]).cities).toEqual([
      { name: "Islamorada, Village of Islands", state: "FL" },
    ]);
  });
});

describe("moving a trip to another year", () => {
  const fall = { name: "Fall colors", startDate: "2027-10-02", endDate: "2027-10-04", states: ["VT"] };

  test("keeps the month, the day and the length", () => {
    expect(planMove(fall, "2028", TODAY)).toEqual({ kind: "move", startDate: "2028-10-02", endDate: "2028-10-04" });
  });

  test("moving to the year it's already in changes nothing", () => {
    expect(planMove(fall, "2027", TODAY)).toEqual({ kind: "same" });
  });

  test("moving into the past is refused with the trip rule", () => {
    const newYears = { ...fall, startDate: "2027-01-01", endDate: "2027-01-02" };
    expect(planMove(newYears, "2026", TODAY)).toEqual({
      kind: "error",
      message: "A planned trip must start in the future.",
    });
  });

  test("a bad year is refused", () => {
    for (const year of ["banana", "", "1999", "2025", "10000"]) {
      expect(planMove(fall, year, TODAY)).toEqual({ kind: "error", message: "Please choose a year from this year on." });
    }
  });
});
