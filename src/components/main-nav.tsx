"use client";
// The main navigation. A client component, so it can mark the page you're on
// (usePathname reads the current address).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "/states", label: "States" },
  { href: "/map", label: "Map" },
  { href: "/visits/new", label: "Add visit" },
  { href: "/trips", label: "Trips" },
  { href: "/years", label: "Years" },
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
      <ul className="flex items-center justify-between gap-1 sm:justify-start">
        {LINKS.map(({ href, label }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              {/* A real link that looks like a shadcn button (same sizes as every button). */}
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                data-slot="button"
                className={buttonVariants({ variant: current ? "secondary" : "ghost" })}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
