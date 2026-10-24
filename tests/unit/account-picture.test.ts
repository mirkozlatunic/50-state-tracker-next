// Slice 22: the account button shows your profile picture (e.g. from Google)
// when you have one, and the plain person icon otherwise.
// Slice 22b: while Clerk is loading it shows an empty circle (no icon that
// then flips to the photo), and the picture comes from Clerk already at the
// button's size (no Vercel resizing).
// Slice 22c: a broken picture address shows the icon instead of crashing the header.
import { describe, expect, test } from "vitest";
import { accountButtonLook } from "@/lib/account-picture";

describe("the account button's look", () => {
  test("someone with a picture gets it from Clerk at twice the button's 28px (sharp on Retina), cropped square", () => {
    const look = accountButtonLook(true, { hasImage: true, imageUrl: "https://img.clerk.com/abc" });
    expect(look.kind).toBe("picture");
    const src = new URL((look as { src: string }).src);
    expect(src.origin + src.pathname).toBe("https://img.clerk.com/abc");
    expect(src.searchParams.get("width")).toBe("56");
    expect(src.searchParams.get("height")).toBe("56");
    expect(src.searchParams.get("fit")).toBe("crop");
  });

  test("a picture address that already has options keeps them", () => {
    const look = accountButtonLook(true, { hasImage: true, imageUrl: "https://img.clerk.com/abc?v=2" });
    expect(new URL((look as { src: string }).src).searchParams.get("v")).toBe("2");
  });

  test("a picture address that isn't a full web address falls back to the icon (no crash)", () => {
    expect(accountButtonLook(true, { hasImage: true, imageUrl: "" })).toEqual({ kind: "icon" });
    expect(accountButtonLook(true, { hasImage: true, imageUrl: "/avatar.png" })).toEqual({ kind: "icon" });
  });

  test("without a picture (Clerk's made-up default isn't used): the person icon", () => {
    expect(accountButtonLook(true, { hasImage: false, imageUrl: "https://img.clerk.com/default" })).toEqual({ kind: "icon" });
  });

  test("while Clerk is still loading: an empty placeholder, neither icon nor picture", () => {
    expect(accountButtonLook(false, undefined)).toEqual({ kind: "loading" });
  });

  test("loaded but signed out (no user): the person icon", () => {
    expect(accountButtonLook(true, null)).toEqual({ kind: "icon" });
  });
});
