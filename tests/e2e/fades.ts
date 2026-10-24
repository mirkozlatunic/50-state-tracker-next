// Slice 22d: watching the light/dark switch's page fades in the browser tests.
// The switch fades with the browser's "view transitions"
// (document.startViewTransition); these helpers wrap that function before the
// page loads, so a test can count the fades and see how long they take.
import type { Page } from "@playwright/test";

/** What the page recorded: fades started and finished, and the fade's
 * animation lengths in milliseconds (from the most recent fade). */
export type FadeRecord = { fades: number; finished: number; durations: number[] };

/** Before the next page load, start counting fades. `failFirst`: the first
 * fade fails to start (it throws), as a browser could, to test what the
 * switch does then. */
export async function recordFades(page: Page, { failFirst = false } = {}) {
  await page.addInitScript((failFirst: boolean) => {
    const record = window as unknown as FadeRecord;
    Object.assign(record, { fades: 0, finished: 0, durations: [] });
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    let failNext = failFirst;
    document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
      if (failNext) {
        failNext = false;
        throw new DOMException("The fade couldn't start", "InvalidStateError");
      }
      record.fades += 1;
      const transition = start(update);
      // Once the fade is drawn, note how long its animations run.
      transition.ready
        .then(() => {
          record.durations = document
            .getAnimations()
            .filter((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition"))
            .map((animation) => Number(animation.effect!.getTiming().duration));
        })
        .catch(() => {});
      transition.finished.finally(() => (record.finished += 1)).catch(() => {});
      return transition;
    }) as typeof document.startViewTransition;
  }, failFirst);
}

/** What the page has recorded so far (see recordFades). */
export async function readFades(page: Page): Promise<FadeRecord> {
  return page.evaluate(() => {
    const { fades, finished, durations } = window as unknown as FadeRecord;
    return { fades, finished, durations };
  });
}
