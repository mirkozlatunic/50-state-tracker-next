// Slice 3: the "X of 50" counter in the header, read from the database.
import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { states, visits } from "@/db/schema";
import { visitedStateCount } from "@/db/queries";
import { ME, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

/** Add a visit to a state, by its code. */
async function addVisit(code: string, visitDate = "2024-07-04") {
  const [state] = await db().select().from(states).where(eq(states.code, code));
  await db().insert(visits).values({ stateId: state.id, visitDate, userId: ME });
}

describe("the counter", () => {
  test("an empty database shows 0 of 50", async () => {
    expect(await visitedStateCount(db(), ME)).toBe(0);
  });

  test("visits to 3 different states count 3", async () => {
    await addVisit("CA");
    await addVisit("NV");
    await addVisit("AZ");
    expect(await visitedStateCount(db(), ME)).toBe(3);
  });

  test("several visits to one state count once", async () => {
    await addVisit("CA", "2024-07-04");
    await addVisit("CA", "2025-01-01");
    expect(await visitedStateCount(db(), ME)).toBe(1);
  });
});
