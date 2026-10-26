// Slice 26: CLAUDE.md (the instructions Claude Code reads first) stays short.
// The detailed design rules live in docs/design-rules.md, which CLAUDE.md pulls
// in with "@docs/design-rules.md", the same way it pulls in AGENTS.md. These
// checks keep the split in place: each design rule is in design-rules.md and
// not also in CLAUDE.md, and the data, security and working rules stay in
// CLAUDE.md itself.
// Slice 26b: each design rule is checked by its full text (so a dropped
// sentence is caught), and the import lines are found however the top of the
// file is spaced or which line endings it uses.
// Slice 26c: CLAUDE.md is checked for repeats with short, whole-word starts of
// each rule, and a CLAUDE.md without any heading fails the imports check.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const CLAUDE = "CLAUDE.md";
const DESIGN = "docs/design-rules.md";
/** The file's text, with each run of spaces and line breaks made one space,
 * so a rule matches however its lines are wrapped. */
const text = (file: string) => readFileSync(file, "utf8").replace(/\s+/g, " ");

// Each design rule, in full (they moved to docs/design-rules.md word for word).
const DESIGN_RULES = [
  "Buttons, fields, cards and pop-ups come from shadcn (`src/components/ui`). Use its sizes so buttons in a row line up; don't hand-roll button styles.",
  "Map colors (brand palette): sage = visited, gold = in a trip that hasn't ended (also striped), pale grey-green = neither. Visited wins over planned. Status never relies on color alone (stripes, check marks, words for screen readers).",
  "City dots: solid navy (light in dark mode) = visited city, hollow with a gold ring = city in a trip that hasn't ended. A city that's both shows the gold ring. One dot per city.",
  "Brand palette (src/app/globals.css): navy #16364B, sage #8FA28B, gold #F1B84A, warm off-white #FBFAF7, plus a matching dark theme. Text on gold is navy; every text color passes 4.5 : 1 contrast (tests/unit/palette.test.ts).",
  "On phones (640px wide or less), `/map` shows the next trip and the four Census regions as cards instead of the map. Bigger screens keep the map.",
  "In every row of buttons, the buttons' vertical centers line up within 1px.",
];

// A short, whole-word start of each design rule (and of the colour rule's
// last sentence), to check CLAUDE.md doesn't repeat any of them.
const DESIGN_RULE_STARTS = [
  "Buttons, fields, cards and pop-ups come from shadcn",
  "Map colors (brand palette)",
  "Status never relies on color alone",
  "City dots: solid navy",
  "Brand palette (src/app/globals.css)",
  "On phones (640px wide or less), `/map` shows",
  "In every row of buttons",
];

// A few of the rules that stay in CLAUDE.md: data, security, secrets, how we work.
const KEPT_RULES = [
  "There are exactly 50 states.",
  '"Today" is the date in Los Angeles',
  "Every page and form action checks who's signed in itself",
  "Never commit `.env*` files, database files or the Clerk secret key.",
  "I type passwords and secret keys myself",
  "Tests use their own temporary database, never my real one.",
  "Plan first, then code. Wait for my OK before writing code.",
  "Write the tests first and show them to me before writing the code.",
  // Slice 27: which photo a city shows, and that the shared page never shows one.
  "A visited city shows a photo: the first photo (oldest upload) of my most recent visit to that city that has photos.",
  "The shared page (`/share/<code>`) never shows photos, visit dates or cities, even though it uses the same map.",
];

describe("CLAUDE.md", () => {
  test("pulls in AGENTS.md and docs/design-rules.md at the top (before the first heading)", () => {
    // Any line ending (\r\n on Windows), blank lines and spaces are fine.
    const lines = readFileSync(CLAUDE, "utf8").split(/\r?\n/).map((line) => line.trim());
    const firstHeading = lines.findIndex((line) => line.startsWith("#"));
    expect(firstHeading, "CLAUDE.md has a heading").toBeGreaterThan(0);
    const top = lines.slice(0, firstHeading);
    expect(top).toContain("@AGENTS.md");
    expect(top).toContain("@docs/design-rules.md");
  });

  test("keeps the data, security, secret and working rules", () => {
    for (const rule of KEPT_RULES) expect(text(CLAUDE), rule).toContain(rule);
  });

  test("no longer repeats the design rules", () => {
    for (const start of DESIGN_RULE_STARTS) expect(text(CLAUDE), start).not.toContain(start);
  });
});

describe("docs/design-rules.md", () => {
  test("exists and has every design rule, in full", () => {
    expect(existsSync(DESIGN)).toBe(true);
    for (const rule of DESIGN_RULES) expect(text(DESIGN), rule).toContain(rule);
  });

  test("holds only design rules (none of the data, security or working rules)", () => {
    for (const rule of KEPT_RULES) expect(text(DESIGN), rule).not.toContain(rule);
  });
});
