// Slice 22: the account button shows your profile picture (e.g. from Google)
// when you have one, and the plain person icon otherwise.
import { describe, expect, test } from "vitest";
import { accountPicture } from "@/lib/account-picture";

describe("the account button's picture", () => {
  test("someone with a picture (e.g. signed in with Google) gets it", () => {
    expect(accountPicture({ hasImage: true, imageUrl: "https://img.clerk.com/abc" })).toBe("https://img.clerk.com/abc");
  });

  test("without one, no picture (Clerk's made-up default isn't used): the icon shows", () => {
    expect(accountPicture({ hasImage: false, imageUrl: "https://img.clerk.com/default" })).toBeNull();
  });

  test("while Clerk is still loading (no user yet), no picture", () => {
    expect(accountPicture(null)).toBeNull();
    expect(accountPicture(undefined)).toBeNull();
  });
});
