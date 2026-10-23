"use client";
/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle is shorter than the sweep, so
 *            two fronts are always in flight
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *
 * Paired with a shimmering label and a live elapsed timer
 * in mono tabular figures. Reduced motion freezes the grid
 * to its dim state; the timer still ticks.
 *
 * Our changes: the animations sit in classes (not inline
 * styles) so motion-reduce: can switch them off; `compact`
 * shows only the grid; the grid and timer are hidden from
 * screen readers (the wrapper around it says what's loading).
 * ───────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/elapsed";

// Each cell's delay in ms. The chevron: a ">" shape sweeping left to right.
const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3),
    c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

// The orbit: cells around the edge light up in turn; the middle one (null) stays dark.
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<string, { delays: (number | null)[]; dur: number; round: boolean }> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

/** The time since the loader appeared, ticking every tenth of a second. */
function ElapsedTimer() {
  const [tenths, setTenths] = useState(0);
  // An effect runs after the loader is on screen; the cleanup stops the timer when it goes away.
  useEffect(() => {
    const timer = setInterval(() => setTenths((t) => t + 1), 100);
    return () => clearInterval(timer);
  }, []);
  return (
    <span aria-hidden className="font-mono text-[12px] text-muted-foreground tabular-nums">
      {formatElapsed(tenths)}
    </span>
  );
}

/** The pixel loader: a 3×3 grid of blinking cells, a shimmering `label` and a timer.
 * `compact`: only the grid, for small spots like the header's counter. */
export default function LoadingState({
  label = "Churning",
  variant = "Drive",
  compact = false,
}: {
  label?: string;
  variant?: string;
  compact?: boolean;
}) {
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  return (
    <div className="flex w-fit items-center gap-2.5">
      <span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {delays.map((d, i) => (
          <span
            key={i}
            className={`size-[4px] bg-foreground ${round ? "rounded-full" : "rounded-[1px]"} ${
              d === null
                ? ""
                : "[animation:pixel-on_var(--pixel-dur)_ease-in-out_var(--pixel-delay)_infinite] motion-reduce:[animation:none]"
            }`}
            // CSS variables carry each cell's timing into the animation class above.
            style={
              {
                opacity: d === null ? 0.07 : 0.15,
                "--pixel-dur": `${dur}ms`,
                "--pixel-delay": `${d ?? 0}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      {!compact && (
        <>
          {/* A light band slides across the text; with Reduce motion it's plain grey text. */}
          <span className="bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] [background-size:200%_100%] bg-clip-text text-[13px] font-medium text-transparent [animation:shimmer-text_1.4s_linear_infinite] motion-reduce:bg-none motion-reduce:text-muted-foreground motion-reduce:[animation:none]">
            {label}
          </span>
          <ElapsedTimer />
        </>
      )}
    </div>
  );
}
