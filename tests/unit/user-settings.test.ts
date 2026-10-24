// Slice 19: each person's settings, one row each. For now: the highest
// milestone already celebrated (0 = none yet).
import { describe, expect, test } from "vitest";
import { celebratedMilestone, setCelebratedMilestone } from "@/db/queries";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

describe("the celebrated milestone", () => {
  test("is 0 for someone who hasn't reached one yet", async () => {
    expect(await celebratedMilestone(db(), ME)).toBe(0);
  });

  test("is saved, and can go up later", async () => {
    await setCelebratedMilestone(db(), ME, 10);
    expect(await celebratedMilestone(db(), ME)).toBe(10);
    await setCelebratedMilestone(db(), ME, 25);
    expect(await celebratedMilestone(db(), ME)).toBe(25);
  });

  test("is each person's own", async () => {
    await setCelebratedMilestone(db(), ME, 25);
    expect(await celebratedMilestone(db(), OTHER)).toBe(0);
  });
});
