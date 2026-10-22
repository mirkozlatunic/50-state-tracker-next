// Slice 10: while a page loads, it shows a skeleton, never a "Loading…" text
// and never an empty space. This test reads the pages and makes sure every
// loading boundary has a skeleton.
// Slice 12: the "skeletons" keep their names, but each one is now the pixel
// loader (src/components/ui/loading-state.tsx) instead of grey blocks.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/** Every .tsx file under a folder. */
function tsxFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

const files = [...tsxFiles(join(process.cwd(), "src/app")), ...tsxFiles(join(process.cwd(), "src/components"))];
const pagesWithSuspense = files.filter((file) => readFileSync(file, "utf8").includes("<Suspense"));

describe("loading screens", () => {
  test("there are loading boundaries to check", () => {
    expect(pagesWithSuspense.length).toBeGreaterThanOrEqual(5);
  });

  test.each(pagesWithSuspense.map((file) => [file.split("src/")[1], file]))(
    "every loading boundary in %s shows a skeleton",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      const boundaries = [...source.matchAll(/<Suspense([^>]*)>/g)].map((match) => match[1]);
      // The header's nav placeholder is the real nav without the "current page"
      // mark, which is better than a grey block, so it counts too.
      for (const props of boundaries) {
        expect(props, "a <Suspense> needs a skeleton fallback").toMatch(/fallback=\{<(\w*Skeleton|NavLinks)/);
      }
    },
  );

  test("no page shows a plain “Loading…” text", () => {
    for (const file of files) expect(readFileSync(file, "utf8"), file).not.toMatch(/>\s*Loading[^<]*</);
  });
});

describe("the pixel loader", () => {
  const skeletons = readFileSync(join(process.cwd(), "src/components/loading-skeletons.tsx"), "utf8");
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  /** Each exported loader: its name and the code inside it. */
  const loaders = [...skeletons.matchAll(/export function (\w+Skeleton)\b[\s\S]*?\n\}/g)].map((match) => ({
    name: match[1],
    body: match[0],
  }));

  test("every loading screen is still there under its old name", () => {
    expect(loaders.map(({ name }) => name).sort()).toEqual(
      [
        "CounterSkeleton",
        "FormSkeleton",
        "ListSkeleton",
        "MapSkeleton",
        "StateSkeleton",
        "StatesSkeleton",
        "TitledFormSkeleton",
        "YearsSkeleton",
      ].sort(),
    );
  });

  test("the grey skeleton blocks are gone", () => {
    expect(skeletons).not.toMatch(/components\/ui\/skeleton/);
    expect(existsSync(join(process.cwd(), "src/components/ui/skeleton.tsx"))).toBe(false);
  });

  test.each(loaders.filter(({ name }) => name !== "CounterSkeleton").map(({ name, body }) => [name, body]))(
    "%s shows the pixel loader with a label saying what's loading",
    (_name, body) => {
      expect(body).toMatch(/<PageLoader\b/);
      expect(body).toMatch(/label="Loading [a-z]/);
    },
  );

  test("the header's counter uses the small loader (just the dots)", () => {
    const counter = loaders.find(({ name }) => name === "CounterSkeleton")!.body;
    expect(counter).toMatch(/<LoadingState\b[^>]*\bcompact\b/);
    expect(counter).toMatch(/role="status"/);
    expect(counter).toMatch(/aria-label="Loading"/);
  });

  test("screen readers hear what's loading, not the dots or the timer", () => {
    expect(skeletons).toMatch(/role="status"/);
    const loader = readFileSync(join(process.cwd(), "src/components/ui/loading-state.tsx"), "utf8");
    // The dots and the ticking timer are hidden from screen readers.
    expect(loader.match(/aria-hidden/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("the animations exist in the stylesheet", () => {
    expect(css).toMatch(/@keyframes pixel-on\b/);
    expect(css).toMatch(/@keyframes shimmer-text\b/);
  });

  test("with Reduce motion on, the loader stands still", () => {
    const loader = readFileSync(join(process.cwd(), "src/components/ui/loading-state.tsx"), "utf8");
    expect(loader).toMatch(/motion-reduce:/);
  });
});
