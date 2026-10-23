// Slice 15: the rope-ring badge is the logo everywhere. The supplied image is
// kept unchanged; the site's logo and icons are made from it (cropped and
// scaled, never redrawn) by scripts/make-icons.sh.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, test } from "vitest";

const root = process.cwd();

/** A PNG file's size, and the color of its top-left pixel as [red, green, blue, alpha]. */
function readPng(path: string) {
  const file = readFileSync(join(root, path));
  expect(file.subarray(0, 8).toString("latin1"), `${path} is a PNG`).toBe("\x89PNG\r\n\x1a\n");
  // A PNG is a list of "chunks": IHDR holds the size and color type, IDAT the pixels.
  let offset = 8;
  let header: Buffer | null = null;
  const pixels: Buffer[] = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString("latin1", offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") header = data;
    if (type === "IDAT") pixels.push(data);
    offset += 12 + length;
  }
  if (!header) throw new Error(`${path} has no IHDR`);
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const colorType = header[9]; // 2 = RGB, 6 = RGB + alpha (8 bits each here)
  expect(header[8], `${path}: 8 bits per channel`).toBe(8);
  // The first row starts with one "filter" byte; for the very first pixel every
  // filter leaves the bytes as they are, so they can be read straight away.
  const rows = inflateSync(Buffer.concat(pixels));
  const first = [...rows.subarray(1, 1 + (colorType === 6 ? 4 : 3))];
  const topLeft = colorType === 6 ? first : [...first, 255];
  return { width, height, topLeft };
}

describe("the supplied logo", () => {
  test("is kept unchanged as the source (1128 × 1120)", () => {
    const source = readPng("docs/brand/logo-source.png");
    expect([source.width, source.height]).toEqual([1128, 1120]);
  });
});

describe("the site's logo (public/logo.png)", () => {
  test("is the badge cropped to a square, big enough to stay sharp", () => {
    const logo = readPng("public/logo.png");
    expect(logo.width).toBe(logo.height);
    expect(logo.width).toBeGreaterThanOrEqual(512);
  });
});

describe("the icons", () => {
  test.each([
    ["public/icons/favicon-32.png", 32],
    ["public/icons/icon-180.png", 180],
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
  ])("%s is %i × %i", (path, size) => {
    const icon = readPng(path);
    expect([icon.width, icon.height]).toEqual([size, size]);
  });

  test.each(["public/icons/icon-180.png", "public/icons/icon-192.png", "public/icons/icon-512.png"])(
    "%s is opaque, on the logo's own cream paper (iPhones show see-through parts as black)",
    (path) => {
      const [red, green, blue, alpha] = readPng(path).topLeft;
      expect(alpha).toBe(255);
      // Cream: light, and a little warmer (more red) than blue.
      expect(Math.min(red, green, blue)).toBeGreaterThan(200);
      expect(red).toBeGreaterThan(blue);
    },
  );

  test("the script that makes them is there, so they can be made again", () => {
    expect(existsSync(join(root, "scripts/make-icons.sh"))).toBe(true);
  });
});
