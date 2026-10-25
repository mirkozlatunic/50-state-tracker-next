// Slice 26: CLAUDE.md (the instructions Claude Code reads first) stays short.
// The detailed design rules live in docs/design-rules.md, which CLAUDE.md pulls
// in with "@docs/design-rules.md", the same way it pulls in AGENTS.md. These
// checks keep the split in place: each design rule is in design-rules.md and
// not also in CLAUDE.md, and the data, security and working rules stay in
// CLAUDE.md itself.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const CLAUDE = "CLAUDE.md";
const DESIGN = "docs/design-rules.md";
/** The file's text, with each run of spaces and line breaks made one space,
 * so a rule matches however its lines are wrapped. */
const text = (file: string) => readFileSync(file, "utf8").replace(/\s+/g, " ");

// The start of each design rule (they moved to docs/design-rules.md).
const DESIGN_RULES = [
  "Buttons, fields, cards and pop-ups come from shadcn",
  "Map colors (brand palette): sage = visited",
  "Status never relies on color alone",
  "City dots: solid navy (light in dark mode) = visited city",
  "Brand palette (src/app/globals.css): navy #16364B",
  "On phones (640px wide or less), `/map` shows the next trip",
  "In every row of buttons, the buttons' vertical centers line up within 1px.",
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
];

describe("CLAUDE.md", () => {
  test("pulls in AGENTS.md and docs/design-rules.md at the top", () => {
    const lines = readFileSync(CLAUDE, "utf8").split("\n");
    expect(lines.slice(0, 2)).toEqual(["@AGENTS.md", "@docs/design-rules.md"]);
  });

  test("keeps the data, security, secret and working rules", () => {
    for (const rule of KEPT_RULES) expect(text(CLAUDE), rule).toContain(rule);
  });

  test("no longer repeats the design rules", () => {
    for (const rule of DESIGN_RULES) expect(text(CLAUDE), rule).not.toContain(rule);
  });
});

describe("docs/design-rules.md", () => {
  test("exists and has every design rule", () => {
    expect(existsSync(DESIGN)).toBe(true);
    for (const rule of DESIGN_RULES) expect(text(DESIGN), rule).toContain(rule);
  });

  test("holds only design rules (none of the data, security or working rules)", () => {
    for (const rule of KEPT_RULES) expect(text(DESIGN), rule).not.toContain(rule);
  });
});
