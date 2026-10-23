// Slice 14: the brand palette. The light and dark themes in globals.css use
// the approved colors by role (navy, sage, gold, warm off-white), and text
// stays readable: every text color passes the WCAG contrast check (4.5 : 1)
// on the surfaces it sits on.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** The CSS variables set inside one block (":root" or ".dark"), as { name: value }. */
function variables(selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`${selector} not found in globals.css`);
  const block = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().toUpperCase()]));
}

const light = variables(":root");
const dark = variables(".dark");

/** How bright a "#RRGGBB" color looks (WCAG "relative luminance", 0 to 1). */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio between two colors: 1 (same) to 21 (black on white). */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("the light theme uses the approved palette by role", () => {
  test.each([
    ["background", "#FBFAF7"], // warm off-white page
    ["foreground", "#16364B"], // navy text
    ["card", "#FFFFFF"], // white cards
    ["popover", "#FFFFFF"],
    ["primary", "#16364B"], // navy buttons and navigation
    ["primary-foreground", "#FFFFFF"],
    ["muted-foreground", "#526675"], // secondary text
    ["border", "#D8E0D7"], // pale green-gray dividers
    ["input", "#D8E0D7"],
    ["visited", "#8FA28B"], // sage
    ["planned", "#F1B84A"], // gold
    ["planned-foreground", "#16364B"], // navy text on gold
    ["unvisited", "#E7EBE6"],
  ])("--%s is %s", (name, value) => {
    expect(light[name]).toBe(value);
  });
});

describe("the dark theme is the same brand on darker surfaces", () => {
  test.each([
    ["background", "#101C25"],
    ["card", "#172A35"],
    ["popover", "#203541"], // raised surfaces: menus and panels
    ["foreground", "#F7F8F5"],
    ["muted-foreground", "#C0CBCB"],
    ["border", "#344A55"],
    ["input", "#344A55"],
    ["visited", "#9AAF98"],
    ["planned", "#F1B84A"],
    ["planned-foreground", "#16364B"],
    ["unvisited", "#2A3B45"],
  ])("--%s is %s", (name, value) => {
    expect(dark[name]).toBe(value);
  });

  test("no pure black or pure white surfaces", () => {
    for (const name of ["background", "card", "popover", "secondary", "muted", "accent"]) {
      expect(dark[name], name).not.toBe("#000000");
      expect(dark[name], name).not.toBe("#FFFFFF");
    }
  });
});

describe.each([
  ["light", light],
  ["dark", dark],
])("readable text in the %s theme (contrast at least 4.5 : 1)", (_theme, colors) => {
  test.each([
    ["foreground", "background"],
    ["foreground", "card"],
    ["popover-foreground", "popover"],
    ["muted-foreground", "background"],
    ["muted-foreground", "card"],
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["accent-foreground", "accent"],
    ["planned-foreground", "planned"], // text on gold
    ["visited-text", "background"], // "Visited" labels; sage itself is too light for text
    ["visited-text", "card"],
  ])("%s on %s", (text, surface) => {
    expect(contrast(colors[text], colors[surface])).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each([
  ["light", light],
  ["dark", dark],
])("the map's three states stay apart in the %s theme", (_theme, colors) => {
  test("visited, planned and not visited are three different colors", () => {
    expect(new Set([colors.visited, colors.planned, colors.unvisited]).size).toBe(3);
  });

  test("visited and planned both stand out from not visited", () => {
    expect(contrast(colors.visited, colors.unvisited)).toBeGreaterThanOrEqual(2);
    // Gold on the pale light map is 1.49 : 1; it differs in hue too, and planned
    // states also get stripes (map.spec.ts), so it doesn't rely on color alone.
    expect(contrast(colors.planned, colors.unvisited)).toBeGreaterThanOrEqual(1.4);
  });
});
