"use client";
// Light/dark: next-themes puts class="dark" on <html> when the theme is dark,
// follows the device until you pick one, remembers your pick on this device,
// and sets it before the page shows, so there's no white flash.

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
