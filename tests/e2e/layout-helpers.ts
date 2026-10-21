// Measuring the page in the browser tests: are buttons lined up and big enough?
import { expect, type Locator } from "@playwright/test";

/** The vertical middle of an element on the screen, in pixels. */
async function middle(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not on the screen");
  return box.y + box.height / 2;
}

/** All these elements' vertical middles are within 1px of each other: they sit on one line. */
export async function expectCentersLineUp(locators: Locator[]) {
  const middles = await Promise.all(locators.map(middle));
  expect(Math.max(...middles) - Math.min(...middles), `middles: ${middles.join(", ")}`).toBeLessThanOrEqual(1);
}

/** The element's content (text or icon) sits in the middle of the element, within 1px. */
export async function expectContentCentered(element: Locator, content: Locator) {
  const [outer, inner] = [await element.boundingBox(), await content.boundingBox()];
  if (!outer || !inner) throw new Error("not on the screen");
  expect(Math.abs(outer.x + outer.width / 2 - (inner.x + inner.width / 2))).toBeLessThanOrEqual(1);
  expect(Math.abs(outer.y + outer.height / 2 - (inner.y + inner.height / 2))).toBeLessThanOrEqual(1);
}

/** Every element is at least this tall (44px is Apple's minimum for a finger). */
export async function expectAtLeastTall(locators: Locator[], pixels: number) {
  for (const locator of locators) {
    const box = await locator.boundingBox();
    expect(box?.height, await locator.textContent() ?? "").toBeGreaterThanOrEqual(pixels);
  }
}
