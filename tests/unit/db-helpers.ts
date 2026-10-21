// A fresh temporary database for each test, never the real data.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";
import { openDatabase, setupDatabase, type Database } from "@/db";

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
