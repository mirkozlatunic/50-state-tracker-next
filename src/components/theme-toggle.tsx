"use client";
// The light/dark switch: an icon button. Both icons are always there and CSS
// shows the right one (dark: classes), so the server and browser agree on
// what to draw before the theme is known.
// Slice 22: the page fades softly (0.3 s) from one theme to the other, using
// the browser's "view transitions": it takes a picture of the page, applies
// the change, and cross-fades from the picture to the new look (the timing is
// in globals.css). Browsers without them, or with "reduce motion" turned on,
// switch at once as before.

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme you last picked, while its fade is running. A fade applies the
  // change a frame after the click, so a quick second click would otherwise
  // still see the old theme and pick the same one again (slice 22b). Each fade
  // applies this latest pick rather than its own, so a double-click ends on
  // the right theme. Refs keep values between clicks without redrawing;
  // they're only read in the click and the fades.
  const switchingTo = useRef<Theme | null>(null);
  // How many fades are still running. When the last one ends, the pick is
  // forgotten, so the next click starts from the theme next-themes reports,
  // even if another tab changed it in the meantime (slice 22c).
  const fadesRunning = useRef(0);

  /** Switch to the other theme, with the fade where it's possible and wanted.
   * `button` is the switch itself (to find its place on the screen). */
  function switchTheme(button: HTMLElement) {
    const current = switchingTo.current ?? resolvedTheme;
    const next: Theme = current === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      setTheme(next);
      return;
    }
    switchingTo.current = next;
    fadesRunning.current += 1;
    const transition = document.startViewTransition(() => {
      const pick = switchingTo.current;
      if (!pick) return; // an earlier fade already applied the latest pick
      // The new look must be in place before this returns, so the browser's
      // "after" picture shows it. next-themes sets the class a moment later
      // (after React redraws), so set it here too, the same way it does:
      // ThemeProvider uses attribute="class" (theme-provider.tsx), so change
      // both together. flushSync makes React redraw right away.
      document.documentElement.classList.toggle("dark", pick === "dark");
      document.documentElement.classList.toggle("light", pick === "light");
      document.documentElement.style.colorScheme = pick;
      flushSync(() => setTheme(pick));
    });
    // A second click cancels the first fade (its change still happens); that
    // cancel isn't an error, so don't let the browser report it as one.
    transition.ready.catch(() => {});

    // While a fade runs, the browser sends every click to the page itself
    // (<html>), not to the button under the mouse. So for that time, a click
    // on the page that lands where the button is (measured at that click, in
    // case the page moved) counts as a click on it.
    const clickDuringFade = (event: MouseEvent) => {
      const box = button.getBoundingClientRect();
      const onButton =
        event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      if (event.target === document.documentElement && onButton) switchTheme(button);
    };
    document.addEventListener("click", clickDuringFade);

    // When this fade is over (finished, cancelled by a newer one, or failed):
    // stop listening, and if it was the last one running, forget the pick.
    // The .catch keeps an error inside the fade from being reported twice.
    transition.finished
      .finally(() => {
        document.removeEventListener("click", clickDuringFade);
        fadesRunning.current -= 1;
        if (fadesRunning.current === 0) switchingTo.current = null;
      })
      .catch(() => {});
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Switch between light and dark mode" onClick={(event) => switchTheme(event.currentTarget)}>
      <Moon className="dark:hidden" aria-hidden />
      <Sun className="hidden dark:block" aria-hidden />
    </Button>
  );
}
