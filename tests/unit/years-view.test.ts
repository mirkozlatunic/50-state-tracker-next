// Slice 7: which years a trip card's "Move to" menu offers.
import { describe, expect, test } from "vitest";
import { moveChoices } from "@/lib/years-view";

describe("the Move to menu", () => {
  test("offers every year on the page except the trip's own column", () => {
    expect(moveChoices([2026, 2027, 2028], 2027)).toEqual([2026, 2028]);
  });

  test("a trip in the first column can move to the later years", () => {
    expect(moveChoices([2026, 2027, 2028, 2029], 2026)).toEqual([2027, 2028, 2029]);
  });
});
