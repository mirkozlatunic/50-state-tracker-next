import type { MetadataRoute } from "next";

// The "web app manifest" at /manifest.webmanifest: what a phone reads when you
// add the app to its home screen (name, icon, open full screen on the map).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "50 States Tracker",
    short_name: "50 States",
    description: "Track your trips through all 50 US states.",
    start_url: "/map",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2e9e4f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
