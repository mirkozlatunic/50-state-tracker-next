import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
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
