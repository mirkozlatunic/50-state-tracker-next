// Slice 30: photos chosen in the add-visit form. At most 6 can be chosen (a
// visit's limit); if a photo can't be added after the visit is saved, the
// message says the visit was saved, which photo failed, and why.
import { describe, expect, test } from "vitest";
import { keepPhotos, photoFailedMessage } from "@/lib/photos";

describe("keepPhotos", () => {
  test("adds the new picks after the ones already chosen", () => {
    expect(keepPhotos(["a"], ["b", "c"])).toEqual({ kept: ["a", "b", "c"], tooMany: false });
  });

  test("keeps at most 6 and says when some were left out", () => {
    expect(keepPhotos([], ["1", "2", "3", "4", "5", "6", "7", "8"])).toEqual({ kept: ["1", "2", "3", "4", "5", "6"], tooMany: true });
    expect(keepPhotos(["1", "2", "3", "4", "5"], ["6", "7"])).toEqual({ kept: ["1", "2", "3", "4", "5", "6"], tooMany: true });
  });

  test("exactly 6 is fine", () => {
    expect(keepPhotos(["1", "2", "3"], ["4", "5", "6"])).toEqual({ kept: ["1", "2", "3", "4", "5", "6"], tooMany: false });
  });

  test("with 6 already chosen, nothing more is added", () => {
    expect(keepPhotos(["1", "2", "3", "4", "5", "6"], ["7"])).toEqual({ kept: ["1", "2", "3", "4", "5", "6"], tooMany: true });
  });
});

describe("photoFailedMessage", () => {
  test("says the visit is saved, which photo failed and why", () => {
    expect(photoFailedMessage(2, 3, "That file isn't a photo.")).toBe("Visit saved, but photo 2 of 3 couldn't be added: That file isn't a photo.");
  });

  test("with a single photo, it doesn't count", () => {
    expect(photoFailedMessage(1, 1, "Please try again.")).toBe("Visit saved, but the photo couldn't be added: Please try again.");
  });
});
