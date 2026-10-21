// Slice 4: reading the visit form and getting its values ready to save.
import { describe, expect, test } from "vitest";
import { checkVisitForm } from "@/lib/visit-form";

const TODAY = "2026-10-20";

/** A filled-in form, as the browser sends it. */
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("checking the visit form", () => {
  test("a good form gives the values to save, with the official city spelling and a trimmed note", () => {
    const result = checkVisitForm(form({ state: "CO", visit_date: "2024-07-04", city: " denver ", note: "  Red Rocks  " }), TODAY);
    expect(result).toEqual({
      ok: true,
      visit: { state: "CO", visitDate: "2024-07-04", city: "Denver", note: "Red Rocks" },
    });
  });

  test("an empty city is saved as no city", () => {
    const result = checkVisitForm(form({ state: "CO", visit_date: "2024-07-04", city: "", note: "" }), TODAY);
    expect(result).toMatchObject({ ok: true, visit: { city: null, note: "" } });
  });

  test("a bad form gives the rule's errors and what you typed, so the form can show it again", () => {
    const result = checkVisitForm(form({ state: "CO", visit_date: "2026-10-21", city: "Denvr", note: "soon" }), TODAY);
    expect(result).toEqual({
      ok: false,
      errors: ["The visit date can't be in the future.", "We couldn't find “Denvr” in Colorado."],
      values: { state: "CO", visitDate: "2026-10-21", city: "Denvr", note: "soon" },
    });
  });

  test("missing fields count as empty, not as a crash", () => {
    const result = checkVisitForm(new FormData(), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Please choose one of the 50 states.");
      expect(result.errors).toContain("Please enter a visit date.");
    }
  });
});
