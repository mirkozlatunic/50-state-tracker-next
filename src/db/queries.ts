// Reading from the database for the pages. Each function takes the database,
// so tests can pass a temporary one.

import { countDistinct } from "drizzle-orm";
import type { Database } from "./index";
import { visits } from "./schema";

/** How many different states have at least one visit (the "X of 50" counter). */
export async function visitedStateCount(db: Database): Promise<number> {
  const [row] = await db.select({ count: countDistinct(visits.stateId) }).from(visits);
  return row.count;
}
