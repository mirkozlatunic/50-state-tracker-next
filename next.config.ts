import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The home page opens the states list.
  // Browsers ask for /favicon.ico by themselves; answer with the PNG tab icon.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icons/favicon-32.png" }];
  },
  async redirects() {
    return [{ source: "/", destination: "/states", permanent: false }];
  },
  // The browser tests open the app at 127.0.0.1, so allow its dev tools there.
  allowedDevOrigins: ["127.0.0.1"],
  // The server reads these files at runtime (with fs), so make sure Vercel ships them.
  outputFileTracingIncludes: {
    "/*": ["src/lib/data/us_cities.csv", "src/db/schema.sql"],
  },
  partialPrefetching: true,
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
