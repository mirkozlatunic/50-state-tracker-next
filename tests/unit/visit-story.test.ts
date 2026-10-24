// Slice 17: a visit's story, the longer optional text on its own visit page.
import { describe, expect, test } from "vitest";
import { checkStory, STORY_MAX } from "@/lib/visit-story";

/** A story form, as the browser sends it. */
function form(story: string | null) {
  const data = new FormData();
  if (story !== null) data.set("story", story);
  return data;
}

describe("checking a story", () => {
  test("is trimmed, and keeps the line breaks inside it", () => {
    expect(checkStory(form("  Day one: Red Rocks.\n\nDay two: Boulder.  "))).toEqual({
      ok: true,
      story: "Day one: Red Rocks.\n\nDay two: Boulder.",
    });
  });

  test("Windows line breaks (\\r\\n) are saved as plain ones", () => {
    expect(checkStory(form("one\r\ntwo"))).toEqual({ ok: true, story: "one\ntwo" });
  });

  test("an empty story (or none sent) clears it", () => {
    expect(checkStory(form("   "))).toEqual({ ok: true, story: "" });
    expect(checkStory(form(null))).toEqual({ ok: true, story: "" });
  });

  test("can be up to 5,000 characters", () => {
    expect(STORY_MAX).toBe(5000);
    expect(checkStory(form("a".repeat(5000)))).toEqual({ ok: true, story: "a".repeat(5000) });
  });

  test("a longer one is refused, and what was typed comes back so nothing is lost", () => {
    const long = "a".repeat(5001);
    expect(checkStory(form(long))).toEqual({
      ok: false,
      error: "A story can be at most 5,000 characters (this one has 5,001).",
      story: long,
    });
  });
});
