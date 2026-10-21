// Slice 2: after 5 wrong passwords within a minute, logins pause for a minute.
// Vercel doesn't keep memory between requests, so the wrong tries are kept in
// the database. Each test uses its own temporary database.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { openDatabase, setupDatabase, type Database } from "@/db";
import { clearFailures, isLocked, LOCK_SECONDS, MAX_WRONG_PASSWORDS, recordFailure } from "@/lib/auth/lockout";

let folder: string;
let db: Database;
const START = Date.UTC(2026, 9, 20, 12, 0, 0); // a fixed moment, in milliseconds

beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), "tracker-test-"));
  db = openDatabase({ url: `file:${join(folder, "test.sqlite")}` });
  await setupDatabase(db);
});

afterEach(() => {
  db.$client.close();
  rmSync(folder, { recursive: true, force: true });
});

/** Record `count` wrong passwords, one second apart, starting at `from`. */
async function fail(count: number, from = START) {
  for (let i = 0; i < count; i++) await recordFailure(db, from + i * 1000);
}

describe("pausing logins", () => {
  test("5 tries in a minute", () => {
    expect([MAX_WRONG_PASSWORDS, LOCK_SECONDS]).toEqual([5, 60]);
  });

  test("4 wrong passwords don't pause anything", async () => {
    await fail(4);
    expect(await isLocked(db, START + 5000)).toBe(false);
  });

  test("the 5th wrong password pauses logins", async () => {
    await fail(5);
    expect(await isLocked(db, START + 5000)).toBe(true);
  });

  test("a minute after the wrong tries, logging in works again", async () => {
    await fail(5);
    expect(await isLocked(db, START + 4000 + 59_000)).toBe(true);
    expect(await isLocked(db, START + 4000 + 61_000)).toBe(false);
  });

  test("wrong tries spread over more than a minute don't add up", async () => {
    await fail(3, START);
    await fail(2, START + 120_000);
    expect(await isLocked(db, START + 122_000)).toBe(false);
  });

  test("logging in correctly forgets the wrong tries", async () => {
    await fail(4);
    await clearFailures(db);
    await fail(1, START + 5000);
    expect(await isLocked(db, START + 6000)).toBe(false);
  });

  test("the wrong tries survive reopening the database (a new Vercel request)", async () => {
    await fail(5);
    db.$client.close();
    db = openDatabase({ url: `file:${join(folder, "test.sqlite")}` });
    expect(await isLocked(db, START + 5000)).toBe(true);
  });
});
