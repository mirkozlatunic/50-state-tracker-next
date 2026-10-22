// "Planned trips: All upcoming trips · 2026 · 2027": which trips count as planned.

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function YearFilter({ year, years }: { year: number | null; years: number[] }) {
  const choices = [{ label: "All upcoming trips", href: "/map", current: year === null }].concat(
    years.map((option) => ({ label: String(option), href: `/map?year=${option}`, current: year === option })),
  );
  return (
    <nav aria-label="Planned trips" className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-sm text-muted-foreground">Planned trips:</span>
      {choices.map((choice) => (
        <Link
          key={choice.href}
          href={choice.href}
          aria-current={choice.current ? "page" : undefined}
          data-slot="button"
          className={buttonVariants({ variant: choice.current ? "secondary" : "ghost", size: "sm" })}
        >
          {choice.label}
        </Link>
      ))}
    </nav>
  );
}
