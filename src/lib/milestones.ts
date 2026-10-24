// Milestones at 10, 25 and 50 visited states (slice 19). They're worked out
// from the visits; only the highest one already celebrated is stored (in
// user_settings), so each one is celebrated once.

export const MILESTONES = [10, 25, 50] as const;

/** Which milestones `visited` states have reached, and how far the next one is. */
export function milestoneProgress(visited: number): { reached: number[]; next: { at: number; toGo: number } | null } {
  const reached = MILESTONES.filter((at) => visited >= at);
  const at = MILESTONES.find((milestone) => visited < milestone);
  return { reached, next: at === undefined ? null : { at, toGo: at - visited } };
}

/** The milestone to celebrate now, or null: the highest one reached that's
 * above the one already celebrated. */
export function newMilestone(visited: number, celebrated: number): number | null {
  const fresh = MILESTONES.filter((at) => visited >= at && at > celebrated);
  return fresh.length ? fresh[fresh.length - 1] : null;
}

/** The celebration's heading, e.g. "You've visited 10 states!". */
export function milestoneTitle(milestone: number): string {
  return milestone === 50 ? "You've visited all 50 states!" : `You've visited ${milestone} states!`;
}
