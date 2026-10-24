"use client";
// The light/dark switch: an icon button. Both icons are always there and CSS
// shows the right one (dark: classes), so the server and browser agree on
// what to draw before the theme is known.
// Slice 22: the page fades softly (0.3 s) from one theme to the other, using
// the browser's "view transitions": it takes a picture of the page, applies
// the change, and cross-fades from the picture to the new look (the timing is
// in globals.css). Browsers without them, or with "reduce motion" turned on,
// switch at once as before.

import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  /** Switch to the other theme, with the fade where it's possible and wanted. */
  function switchTheme() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      setTheme(next);
      return;
    }
    document.startViewTransition(() => {
      // The new look must be in place before this returns, so the browser's
      // "after" picture shows it. next-themes sets the class a moment later
      // (after React redraws), so set it here too; flushSync makes React
      // redraw right away instead of when it gets round to it.
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.classList.toggle("light", next === "light");
      document.documentElement.style.colorScheme = next;
      flushSync(() => setTheme(next));
    });
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Switch between light and dark mode" onClick={switchTheme}>
      <Moon className="dark:hidden" aria-hidden />
      <Sun className="hidden dark:block" aria-hidden />
    </Button>
  );
}
