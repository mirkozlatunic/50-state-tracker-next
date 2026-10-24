// Slice 19: milestones at 10, 25 and 50 visited states. They're worked out
// from the visits; only the highest one already celebrated is stored, so each
// is celebrated once.
import { describe, expect, test } from "vitest";
import { MILESTONES, milestoneProgress, newMilestone } from "@/lib/milestones";

describe("the milestones", () => {
  test("are 10, 25 and 50 states", () => {
    expect(MILESTONES).toEqual([10, 25, 50]);
  });

  test("with no visits: none reached, 10 states to go to the first", () => {
    expect(milestoneProgress(0)).toEqual({ reached: [], next: { at: 10, toGo: 10 } });
  });

  test("with 12 states: 10 reached, 13 to go to 25", () => {
    expect(milestoneProgress(12)).toEqual({ reached: [10], next: { at: 25, toGo: 13 } });
  });

  test("exactly on a milestone counts as reached", () => {
    expect(milestoneProgress(25)).toEqual({ reached: [10, 25], next: { at: 50, toGo: 25 } });
  });

  test("all 50: every milestone reached, nothing next", () => {
    expect(milestoneProgress(50)).toEqual({ reached: [10, 25, 50], next: null });
  });
});

describe("which milestone to celebrate after saving a visit", () => {
  test("reaching 10 for the first time", () => {
    expect(newMilestone(10, 0)).toBe(10);
  });

  test("nothing below the first milestone", () => {
    expect(newMilestone(9, 0)).toBeNull();
  });

  test("nothing new once it's been celebrated", () => {
    expect(newMilestone(11, 10)).toBeNull();
    expect(newMilestone(10, 10)).toBeNull();
  });

  test("passing two at once celebrates the higher one", () => {
    expect(newMilestone(26, 0)).toBe(25);
    expect(newMilestone(26, 10)).toBe(25);
  });

  test("50 after 25", () => {
    expect(newMilestone(50, 25)).toBe(50);
  });

  test("after deleting visits below a milestone, getting back to it isn't celebrated again", () => {
    expect(newMilestone(12, 25)).toBeNull();
    expect(newMilestone(25, 25)).toBeNull();
  });
});
