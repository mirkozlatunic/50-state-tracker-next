// Slice 25: the README is the project's showcase (what it does, features,
// screenshots, how it was built); the running and setup details live in
// docs/operations.md. These checks keep both honest: every link and picture
// points at a file that exists, operations.md covers every setting, and
// nothing private (a secret, this computer's paths) ends up in them.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";

const README = "README.md";
const OPERATIONS = "docs/operations.md";
const read = (file: string) => readFileSync(file, "utf8");

/** The relative links and pictures in a Markdown file ([text](path), ![alt](path)),
 * without web addresses, in-page anchors or the #part after a file name. */
function localLinks(file: string): string[] {
  const targets = [...read(file).matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);
  return targets.filter((target) => !/^(https?:|mailto:|#)/.test(target)).map((target) => target.split("#")[0]);
}

// The eight screenshots: the landing page and the map, on a computer and an
// iPhone, in light and dark.
const SCREENSHOTS = ["landing", "map"].flatMap((page) =>
  ["desktop", "iphone"].flatMap((size) => ["light", "dark"].map((scheme) => `docs/screenshots/${page}-${size}-${scheme}.png`)),
);

describe("the README", () => {
  test("starts with the app's name, then what it does, features, screenshots and how it was built", () => {
    const text = read(README);
    expect(text.startsWith("# 50 States Tracker\n")).toBe(true);
    const headings = [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(headings.slice(0, 3)).toEqual(["Features", "Screenshots", "How it was built"]);
  });

  test("shows all eight screenshots", () => {
    const links = localLinks(README);
    for (const file of SCREENSHOTS) expect(links, file).toContain(file);
  });

  test("links to the operations guide", () => {
    expect(localLinks(README)).toContain(OPERATIONS);
  });

  test("keeps the setup details out (they're in docs/operations.md)", () => {
    const text = read(README);
    for (const detail of ["turso db create", "BLOB_READ_WRITE_TOKEN", "gh secret set", "make-icons.sh"]) {
      expect(text, detail).not.toContain(detail);
    }
  });
});

describe("the screenshots", () => {
  test.each(SCREENSHOTS)("%s is a PNG picture", (file) => {
    expect(existsSync(file)).toBe(true);
    // Every PNG file starts with the same 8 bytes.
    expect([...readFileSync(file).subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});

describe("docs/operations.md", () => {
  test("covers every setting the app reads", () => {
    const text = read(OPERATIONS);
    for (const setting of [
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
      "CLERK_WEBHOOK_SIGNING_SECRET",
      "DATABASE_URL",
      "DATABASE_AUTH_TOKEN",
      "BLOB_READ_WRITE_TOKEN",
      "PHOTO_STORE",
      "PHOTO_DIR",
    ]) {
      expect(text, setting).toContain(setting);
    }
  });

  test("covers the checks, the backup, the photo store and the Clerk settings", () => {
    const text = read(OPERATIONS);
    for (const topic of ["pnpm test:live", "pnpm screenshots", "Download backup", "tracker-photos", "Invite-only", "/api/webhooks/clerk"]) {
      expect(text, topic).toContain(topic);
    }
  });
});

describe("both files", () => {
  test.each([README, OPERATIONS])("every link and picture in %s points at a file that exists", (file) => {
    for (const target of localLinks(file)) expect(existsSync(join(dirname(file), target)), target).toBe(true);
  });

  test.each([README, OPERATIONS])("%s has no secret and no path from this computer", (file) => {
    const text = read(file);
    expect(text).not.toMatch(/whsec_[A-Za-z0-9+/=]{20,}/); // a webhook signing secret
    expect(text).not.toMatch(/sk_(live|test)_[A-Za-z0-9]{20,}/); // a Clerk secret key
    expect(text).not.toMatch(/\/Users\/|\/home\/[a-z]/); // someone's own folders
  });
});
