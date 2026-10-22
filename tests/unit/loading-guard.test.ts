// Slice 10: while a page loads, it shows a skeleton (grey blocks shaped like
// the content), never a "Loading…" text and never an empty space. This test
// reads the pages and makes sure every loading boundary has a skeleton.
import { readdirSync, readFileSync } from "node:fs";
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
