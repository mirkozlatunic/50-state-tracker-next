// Slice 8: every form action that changes data must check the login first.
// Slice 13: that check is requireUserId(), which also says whose data it is.
// This test reads the action files and makes sure.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/** Every actions.ts file under src/app/(app), the pages behind the login. */
function actionFiles(folder = join(process.cwd(), "src/app/(app)")): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return actionFiles(path);
    return entry.name === "actions.ts" ? [path] : [];
  });
}

describe("form actions behind the login", () => {
  test("there are some to check", () => {
    expect(actionFiles().length).toBeGreaterThanOrEqual(2);
  });

  test.each(actionFiles().map((file) => [file.split("src/app/")[1], file]))(
    "every action in %s first finds out who's signed in",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      // Each exported action's first statement: the line after the "{" that
      // ends the function's first line (a return type can have "{ }" too).
      const actions = [...source.matchAll(/export async function (\w+)[^\n]*\{\n\s*([^;\n]+);/g)];
      expect(actions.length).toBeGreaterThan(0);
      for (const [, name, firstStatement] of actions) {
        expect(firstStatement.trim(), name).toBe("const userId = await requireUserId()");
      }
    },
  );
});
