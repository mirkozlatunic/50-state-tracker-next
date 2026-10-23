"use client";
// A header that floats at the top of the screen and stays there while you
// scroll. Scrolling down shrinks it to a round button; scrolling back up, or
// tapping the button, opens it again.
// Adapted from a Framer Motion example. "motion" (formerly Framer Motion) is an
// animation library: you describe the states an element can be in ("variants")
// and it animates smoothly between them, including to a width of "auto".

import * as React from "react";
import { Menu } from "lucide-react";
import { MotionConfig, motion, useMotionValueEvent, useScroll, type Variants } from "motion/react";

const COLLAPSE_AFTER = 150; // pixels scrolled down before it shrinks
const EXPAND_AFTER = 80; // pixels scrolled back up before it opens again

// The pill: its natural width when open, a 3rem circle when shrunk.
// "afterChildren" fades the contents out first, then shrinks the pill.
const pillVariants: Variants = {
  expanded: {
    width: "auto",
    transition: { type: "spring", damping: 20, stiffness: 300, staggerChildren: 0.05, delayChildren: 0.1 },
  },
  collapsed: {
    width: "3rem",
    transition: { type: "spring", damping: 20, stiffness: 300, when: "afterChildren" },
  },
};

// The contents (brand, links, buttons) slide in from the left as the pill opens.
const contentVariants: Variants = {
  expanded: { opacity: 1, x: 0, transition: { type: "spring", damping: 15 } },
  collapsed: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// The menu icon shown while shrunk.
const iconVariants: Variants = {
  expanded: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  collapsed: { opacity: 1, scale: 1, transition: { type: "spring", damping: 15, stiffness: 300, delay: 0.15 } },
};

/** The page's header (a "banner" for screen readers), holding `children` in a floating pill. */
export function AnimatedNav({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = React.useState(true);
  // useScroll gives a live value for how far the page is scrolled.
  const { scrollY } = useScroll();
  // Refs remember numbers between scroll events without redrawing the page.
  const lastScrollY = React.useRef(0);
  const scrollYWhenCollapsed = React.useRef(0);

  // Runs on every scroll (not during drawing, so reading refs here is fine).
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current;
    if (expanded && latest > previous && latest > COLLAPSE_AFTER) {
      setExpanded(false);
      scrollYWhenCollapsed.current = latest;
    } else if (!expanded && latest < previous && scrollYWhenCollapsed.current - latest > EXPAND_AFTER) {
      setExpanded(true);
    }
    lastScrollY.current = latest;
  });

  return (
    // reducedMotion="user": with "Reduce motion" on in the device's settings, it changes without animating.
    <MotionConfig reducedMotion="user">
      {/* The header spans the width but lets clicks through; only the pill catches them.
          The safe-area inset keeps it below the iPhone's status bar in the home-screen app. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <motion.div
          initial={false}
          animate={expanded ? "expanded" : "collapsed"}
          variants={pillVariants}
          className="pointer-events-auto relative flex h-12 max-w-full items-center overflow-hidden rounded-full border bg-background/80 shadow-lg backdrop-blur-sm"
        >
          {/* inert: while shrunk, the hidden links can't be tabbed to or clicked. */}
          <motion.div
            variants={contentVariants}
            inert={!expanded}
            className="flex items-center gap-1 px-2 whitespace-nowrap"
          >
            {children}
          </motion.div>
          {!expanded && (
            <button
              type="button"
              aria-label="Show navigation"
              onClick={() => setExpanded(true)}
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full"
            >
              <motion.span initial="expanded" animate="collapsed" variants={iconVariants}>
                <Menu className="size-5" aria-hidden />
              </motion.span>
            </button>
          )}
        </motion.div>
      </header>
    </MotionConfig>
  );
}
