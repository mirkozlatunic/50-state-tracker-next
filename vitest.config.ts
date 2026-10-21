// Vitest runs the fast tests in tests/unit (logic and data, no browser).
// The "@/..." shortcut points to src/, like in the app.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
