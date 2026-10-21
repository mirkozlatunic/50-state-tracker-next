// Slice 1: working with "YYYY-MM-DD" dates.
import { describe, expect, test } from "vitest";
import { parseDate, shiftToYear, todayIn } from "@/lib/dates";

describe("reading a date", () => {
  test("a real date comes back as it was written", () => {
    expect(parseDate("2024-07-04")).toBe("2024-07-04");
  });

  test("impossible or badly written dates give null", () => {
    for (const text of ["2024-02-30", "2027-02-29", "2024-13-01", "2024-7-4", "July 4", ""]) {
      expect(parseDate(text)).toBeNull();
    }
  });

  test("Feb 29 is real in a leap year", () => {
    expect(parseDate("2028-02-29")).toBe("2028-02-29");
  });
});

describe("shifting a trip to another year", () => {
  test("keeps the month and day", () => {
    expect(shiftToYear("2026-11-06", "2026-11-08", 2027)).toEqual({ startDate: "2027-11-06", endDate: "2027-11-08" });
  });

  test("works backwards too", () => {
    expect(shiftToYear("2028-05-01", "2028-05-03", 2027)).toEqual({ startDate: "2027-05-01", endDate: "2027-05-03" });
  });

  test("a trip across New Year keeps its length", () => {
    expect(shiftToYear("2026-12-30", "2027-01-02", 2027)).toEqual({ startDate: "2027-12-30", endDate: "2028-01-02" });
  });

  test("Feb 29 becomes Feb 28 in a normal year, keeping the length", () => {
    expect(shiftToYear("2028-02-29", "2028-03-02", 2029)).toEqual({ startDate: "2029-02-28", endDate: "2029-03-02" });
  });

  test("Feb 29 stays in a leap year", () => {
    expect(shiftToYear("2028-02-29", "2028-03-01", 2032)).toEqual({ startDate: "2032-02-29", endDate: "2032-03-01" });
  });
});

describe("today's date", () => {
  // 03:30 UTC on Oct 21 is still the evening of Oct 20 in the US.
  const now = new Date("2026-10-21T03:30:00Z");

  test("follows the time zone, not the server's clock", () => {
    expect(todayIn("UTC", now)).toBe("2026-10-21");
    expect(todayIn("America/New_York", now)).toBe("2026-10-20");
    expect(todayIn("America/Los_Angeles", now)).toBe("2026-10-20");
  });
});

describe("the app's time zone", () => {
  test("is Los Angeles, so a late-evening visit there still counts as today", async () => {
    const { APP_TIME_ZONE } = await import("@/lib/dates");
    expect(APP_TIME_ZONE).toBe("America/Los_Angeles");
  });
});
