// Slice 21: the made-up tracker shown on the landing page. It isn't anyone's
// real data, but it follows the same rules as real visits and trips.
import { describe, expect, test } from "vitest";
import { findCity } from "@/lib/cities";
import { demoData } from "@/lib/demo-data";
import { STATE_CODES } from "@/lib/data/states";
import { cityDots, countVisitedStates, nextTrip, stateStatuses } from "@/lib/progress";

const TODAY = "2026-10-24";
const data = demoData(TODAY);

describe("the sample tracker", () => {
  test("has 18 visited states, all real ones", () => {
    expect(countVisitedStates(data.visits)).toBe(18);
    for (const visit of data.visits) expect(STATE_CODES.has(visit.state), visit.state).toBe(true);
  });

  test("shows 18 visited and 4 planned states on the map", () => {
    const statuses = Object.values(stateStatuses(data, TODAY));
    expect(statuses.filter((status) => status === "visited")).toHaveLength(18);
    expect(statuses.filter((status) => status === "planned")).toHaveLength(4);
  });

  test("no visit is in the future", () => {
    for (const visit of data.visits) expect(visit.visitDate <= TODAY, visit.visitDate).toBe(true);
  });

  test("every city is in the city list and in its own state", () => {
    for (const visit of data.visits) {
      if (visit.city) expect(findCity(visit.city, visit.state), `${visit.city}, ${visit.state}`).not.toBeNull();
    }
    for (const trip of data.trips) {
      for (const city of trip.cities) {
        expect(findCity(city.name, city.state), `${city.name}, ${city.state}`).not.toBeNull();
        expect(trip.states).toContain(city.state);
      }
    }
  });

  test("its trips start in the future and don't end before they start, whatever day it is", () => {
    for (const today of [TODAY, "2027-02-28", "2030-12-31"]) {
      for (const trip of demoData(today).trips) {
        expect(trip.startDate > today, trip.name).toBe(true);
        expect(trip.endDate >= trip.startDate, trip.name).toBe(true);
      }
    }
  });

  test("has a next trip and some city dots", () => {
    expect(nextTrip(data.trips, TODAY)).not.toBeNull();
    expect(cityDots(data, TODAY).length).toBeGreaterThan(3);
  });
});
