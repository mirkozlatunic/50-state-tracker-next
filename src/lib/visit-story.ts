// A visit's story: the longer, optional text on its visit page (slice 17).

import { z } from "zod";

/** The longest story, in characters (about two pages). */
export const STORY_MAX = 5000;

/** A story's length as people count it: emoji and accented letters count once. */
export function storyLength(story: string): number {
  return [...story].length;
}

/** 5000 → "5,000". */
export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

export type StoryResult = { ok: true; story: string } | { ok: false; error: string; story: string };

/** Check the story form. OK: the trimmed story ("" clears it). Too long: the
 * error, and what was typed, so the form can show it again. */
export function checkStory(form: FormData): StoryResult {
  const typed = z.string().catch("").parse(form.get("story"));
  // Windows sends line breaks as \r\n; store them all as \n.
  const story = typed.replace(/\r\n/g, "\n").trim();
  const length = storyLength(story);
  if (length > STORY_MAX) {
    return {
      ok: false,
      error: `A story can be at most ${formatCount(STORY_MAX)} characters (this one has ${formatCount(length)}).`,
      story: typed,
    };
  }
  return { ok: true, story };
}
