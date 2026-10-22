import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
