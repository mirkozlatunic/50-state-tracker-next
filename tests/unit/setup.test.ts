// Slice 0: the test tools work and the shadcn helper is wired up.
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn() from shadcn", () => {
  it("joins class names and drops empty ones", () => {
    expect(cn("px-2", false && "hidden", "py-1")).toBe("px-2 py-1");
  });

  it("lets a later Tailwind class win over an earlier one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
