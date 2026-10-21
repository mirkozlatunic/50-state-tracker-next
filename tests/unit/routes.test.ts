// Slice 4: state page addresses are checked before the page starts, so an
// unknown state gets a real "404 not found" status.
import { describe, expect, test } from "vitest";
import { checkStatePath } from "@/lib/routes";

describe("state page addresses", () => {
  test("a real state's page opens", () => {
    expect(checkStatePath("/states/CA")).toEqual({ kind: "ok" });
  });

  test("a lower-case code is sent on to the upper-case address", () => {
    expect(checkStatePath("/states/ca")).toEqual({ kind: "redirect", to: "/states/CA" });
  });

  test("D.C. or a made-up code is not found", () => {
    expect(checkStatePath("/states/DC")).toEqual({ kind: "not-found" });
    expect(checkStatePath("/states/xx")).toEqual({ kind: "not-found" });
  });

  test("other pages aren't touched", () => {
    for (const path of ["/states", "/visits/new", "/map", "/states/CA/extra"]) {
      expect(checkStatePath(path)).toEqual({ kind: "ok" });
    }
  });
});
