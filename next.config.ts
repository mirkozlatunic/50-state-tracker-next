import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Browsers ask for /favicon.ico by themselves; answer with the PNG tab icon.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icons/favicon-32.png" }];
  },
  // The browser tests open the app at 127.0.0.1, so allow its dev tools there.
  allowedDevOrigins: ["127.0.0.1"],
  // The server reads these files at runtime (with fs), so make sure Vercel ships them.
  outputFileTracingIncludes: {
    "/*": ["src/lib/data/us_cities.csv", "src/db/schema.sql"],
  },
  partialPrefetching: true,
  // Profile pictures (e.g. from Google) come from Clerk's image server; next/image
  // only resizes pictures from servers listed here.
  images: {
    remotePatterns: [new URL("https://img.clerk.com/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
