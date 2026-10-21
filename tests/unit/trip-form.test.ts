// Slice 5: reading the trip form, and the limits of its start date picker.
import { describe, expect, test } from "vitest";
import { checkTripForm, readYear, returnPath, startDateLimits } from "@/lib/trip-form";

const TODAY = "2026-10-20";

/** A filled-in trip form, as the browser sends it (states and cities can repeat). */
function form(fields: { name?: string; start?: string; end?: string; states?: string[]; cities?: string[] }) {
  const data = new FormData();
  data.set("name", fields.name ?? "Weekend");
  data.set("start_date", fields.start ?? "2026-11-06");
  data.set("end_date", fields.end ?? "2026-11-08");
  for (const code of fields.states ?? ["AZ", "UT"]) data.append("states", code);
  for (const city of fields.cities ?? []) data.append("cities", city);
  return data;
}

describe("checking the trip form", () => {
  test("a good form gives the trip to save, with the name trimmed and official city names", () => {
    expect(checkTripForm(form({ name: "  Four Corners  ", cities: ["moab, ut"] }), TODAY)).toEqual({
      ok: true,
      trip: {
        name: "Four Corners",
        startDate: "2026-11-06",
        endDate: "2026-11-08",
        states: ["AZ", "UT"],
        cities: [{ name: "Moab", state: "UT" }],
      },
    });
  });

  test("a state ticked twice counts once", () => {
    const result = checkTripForm(form({ states: ["AZ", "AZ"] }), TODAY);
    expect(result).toMatchObject({ ok: true, trip: { states: ["AZ"] } });
  });

  test("trip and city errors come together, with what was typed", () => {
    const result = checkTripForm(form({ start: TODAY, states: ["CO"], cities: ["Seattle, WA"] }), TODAY);
    expect(result).toEqual({
      ok: false,
      errors: ["A planned trip must start in the future.", "Seattle, WA isn't in this trip's states."],
      values: { name: "Weekend", startDate: TODAY, endDate: "2026-11-08", states: ["CO"], cities: ["Seattle, WA"] },
    });
  });

  test("when editing, the trip's own start date may be kept even if it has passed", () => {
    const edit = form({ start: "2026-10-19", end: "2026-10-22" });
    expect(checkTripForm(edit, TODAY).ok).toBe(false);
    expect(checkTripForm(edit, TODAY, "2026-10-19").ok).toBe(true);
  });

  test("missing fields count as empty, not as a crash", () => {
    const result = checkTripForm(new FormData(), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("Please choose at least one state.");
  });
});

describe("the start date picker's limits", () => {
  test("a new trip starts tomorrow at the earliest, with no latest day", () => {
    expect(startDateLimits({ today: TODAY })).toEqual({ min: "2026-10-21", max: null });
  });

  test("planning in a future year keeps the start inside that year", () => {
    expect(startDateLimits({ today: TODAY, year: 2027 })).toEqual({ min: "2027-01-01", max: "2027-12-31" });
  });

  test("planning in this year still starts tomorrow at the earliest", () => {
    expect(startDateLimits({ today: TODAY, year: 2026 })).toEqual({ min: "2026-10-21", max: "2026-12-31" });
  });

  test("editing a trip in progress lets you keep its start date", () => {
    expect(startDateLimits({ today: TODAY, keepStart: "2026-10-18" })).toEqual({ min: "2026-10-18", max: null });
    expect(startDateLimits({ today: TODAY, keepStart: "2026-12-01" })).toEqual({ min: "2026-10-21", max: null });
  });
});

describe("the ?year= and return_to values", () => {
  test("a year from this year on is used; anything else is ignored", () => {
    expect(readYear("2027", TODAY)).toBe(2027);
    expect(readYear("2026", TODAY)).toBe(2026);
    for (const bad of ["1999", "2025", "banana", "", undefined, "10000"]) expect(readYear(bad, TODAY)).toBeNull();
  });

  test("after saving or deleting, only the years page or the trips page", () => {
    expect(returnPath("years")).toBe("/years");
    for (const other of ["", null, "https://example.com", "/states"]) expect(returnPath(other)).toBe("/trips");
  });
});
