import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Each page sets its own name, e.g. "States" becomes "States · 50 States Tracker".
  title: { default: "50 States Tracker", template: "%s · 50 States Tracker" },
  description: "Track trips through all 50 US states.",
  // The browser tab icon and the iPhone home screen icon (the Flask app's icons).
  icons: {
    icon: [{ url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" }],
    apple: "/icons/icon-180.png",
  },
  // "Add to Home Screen": opens full screen, with "50 States" under the icon.
  appleWebApp: { capable: true, title: "50 States" },
};

// The phone's top bar matches the page background in each theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#101C25" },
  ],
};

// Clerk's sign-in forms drawn with the shadcn colors from globals.css.
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorBackground: "var(--card)",
    colorForeground: "var(--card-foreground)",
    colorMutedForeground: "var(--muted-foreground)",
    colorMuted: "var(--muted)",
    colorInput: "var(--background)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorRing: "var(--ring)",
    colorDanger: "var(--destructive)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-geist-sans)",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes adds class="dark" to <html> before
    // React starts, and that difference is expected.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ClerkProvider lets every page know who's signed in. Its forms use the
            app's own colors (CSS variables), so they follow light and dark too. */}
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/sign-in" appearance={CLERK_APPEARANCE}>
          <ThemeProvider>{children}</ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
