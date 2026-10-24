// Slice 20: sharing my map. Off by default; turning it on makes a share code;
// a new link replaces the old one; stopping removes it. The shared page sees
// only which states I've visited.
import { describe, expect, test } from "vitest";
import {
  addTrip,
  addVisit,
  celebratedMilestone,
  setCelebratedMilestone,
  sharedProgress,
  shareId,
  startSharing,
  stopSharing,
} from "@/db/queries";
import { ME, OTHER, withTestDatabase } from "./db-helpers";

const db = withTestDatabase();

/** A visit of `userId` to `state`. */
const visit = (userId: string, state: string) => addVisit(db(), userId, { state, visitDate: "2024-07-04", note: "secret note", city: null });

describe("sharing my map", () => {
  test("is off at first", async () => {
    expect(await shareId(db(), ME)).toBeNull();
  });

  test("turning it on makes a share code, which leads to my progress", async () => {
    await visit(ME, "CO");
    const code = await startSharing(db(), ME);
    expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await shareId(db(), ME)).toBe(code);
    expect(await sharedProgress(db(), code)).toEqual({ visitedStates: ["CO"] });
  });

  test("a new link replaces the old one, which stops working", async () => {
    const first = await startSharing(db(), ME);
    const second = await startSharing(db(), ME);
    expect(second).not.toBe(first);
    expect(await sharedProgress(db(), first)).toBeNull();
    expect(await sharedProgress(db(), second)).not.toBeNull();
  });

  test("stopping removes the link", async () => {
    const code = await startSharing(db(), ME);
    await stopSharing(db(), ME);
    expect(await shareId(db(), ME)).toBeNull();
    expect(await sharedProgress(db(), code)).toBeNull();
  });

  test("an unknown code leads nowhere", async () => {
    expect(await sharedProgress(db(), "a".repeat(22))).toBeNull();
  });

  test("doesn't touch my celebrated milestone", async () => {
    await setCelebratedMilestone(db(), ME, 10);
    await startSharing(db(), ME);
    await stopSharing(db(), ME);
    expect(await celebratedMilestone(db(), ME)).toBe(10);
  });
});

describe("what a shared link shows", () => {
  test("only which states I've visited: each once, A to Z; no trips", async () => {
    await visit(ME, "UT");
    await visit(ME, "CO");
    await visit(ME, "CO");
    await addTrip(db(), ME, { name: "Soon", startDate: "2099-01-01", endDate: "2099-01-02", states: ["NM"], cities: [] });
    const code = await startSharing(db(), ME);
    expect(await sharedProgress(db(), code)).toEqual({ visitedStates: ["CO", "UT"] });
  });

  test("only mine, never someone else's", async () => {
    await visit(ME, "CO");
    await visit(OTHER, "TX");
    const mine = await startSharing(db(), ME);
    const theirs = await startSharing(db(), OTHER);
    expect(await sharedProgress(db(), mine)).toEqual({ visitedStates: ["CO"] });
    expect(await sharedProgress(db(), theirs)).toEqual({ visitedStates: ["TX"] });
  });
});
