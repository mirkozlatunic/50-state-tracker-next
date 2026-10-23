// A fresh temporary database for each test, never the real data.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";
import { openDatabase, setupDatabase, type Database } from "@/db";

// Two made-up people (Clerk user ids look like "user_2ab..."). Most tests use
// ME; the per-person tests check that OTHER never sees or changes ME's data.
export const ME = "user_me";
export const OTHER = "user_other";

/** Give each test in the file its own set-up database; returns a getter for it. */
export function withTestDatabase(): () => Database {
  let folder = "";
  let db: Database;
  beforeEach(async () => {
    folder = mkdtempSync(join(tmpdir(), "tracker-test-"));
    db = openDatabase({ url: `file:${join(folder, "test.sqlite")}` });
    await setupDatabase(db);
  });
  afterEach(() => {
    db.$client.close();
    rmSync(folder, { recursive: true, force: true });
  });
  return () => db;
}
