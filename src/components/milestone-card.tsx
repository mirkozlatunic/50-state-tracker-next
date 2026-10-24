"use client";
// The celebration when a saved visit reaches a milestone (slice 19): a gold
// card at the top of the state page, with the badge and a close button.
// It shows once: as soon as it's on screen, "?milestone=10" is taken out of
// the address (without reloading), so a reload doesn't show it again.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { milestoneTitle } from "@/lib/milestones";

export function MilestoneCard({ milestone }: { milestone: number }) {
  const [open, setOpen] = useState(true);

  // An effect runs after the card is on screen. history.replaceState swaps the
  // address in place: no new page, and no reload, so the card stays.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("milestone");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  if (!open) return null;
  return (
    <section
      aria-label="Milestone"
      className="relative flex items-center gap-4 rounded-xl bg-planned p-4 pr-12 text-planned-foreground shadow-sm"
    >
      <BrandLogo pixels={56} />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{milestoneTitle(milestone)}</h2>
        <p className="text-sm">{milestone === 50 ? "Every single one. What a journey." : "One more milestone on the journey."}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute top-2 right-2 text-planned-foreground hover:bg-planned-foreground/10"
      >
        <X aria-hidden />
      </Button>
    </section>
  );
}
