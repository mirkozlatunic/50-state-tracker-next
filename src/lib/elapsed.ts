// The pixel loader's timer text. It counts whole tenths of a second (12 = 1.2s)
// so the numbers never pick up rounding errors like 0.30000000000000004.

/** "1.2s" under a minute, "1m 15.4s" from a minute on. */
export function formatElapsed(tenths: number): string {
  const minutes = Math.floor(tenths / 600);
  const rest = tenths % 600; // tenths left over after the whole minutes
  const seconds = `${Math.floor(rest / 10)}.${rest % 10}s`;
  return minutes > 0 ? `${minutes}m ${seconds}` : seconds;
}
