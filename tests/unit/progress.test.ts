// Slice 1: what the pages show, worked out from the visits and trips —
// map colors, the year plan, city dots, region cards and the next trip.
// (The same checks as the Flask app's test_map, test_years, test_city_dots and
// test_regions.) These functions only take plain data, so no database is needed.
import { describe, expect, test } from "vitest";
import {
  cityDots,
  countVisitedStates,
  nextTrip,
  regionSummaries,
  stateStatuses,
  tripYears,
  upcomingTrips,
  yearPlan,
  type Trip,
  type Visit,
} from "@/lib/progress";

const TODAY = "2026-10-20";

let nextId = 1;

/** A visit (in 2024 unless a date is given). */
function visit(state: string, city: string | null = null, visitDate = "2024-07-04"): Visit {
  return { state, visitDate, city };
}

/** A trip; its states default to the states of its cities. */
function trip(
  name: string,
  startDate: string,
  endDate: string,
  states: string[],
  cities: [string, string][] = [],
): Trip {
  return { id: nextId++, name, startDate, endDate, states, cities: cities.map(([n, s]) => ({ name: n, state: s })) };
}

describe("progress", () => {
  test("an empty tracker is 0 of 50", () => {
    expect(countVisitedStates([])).toBe(0);
  });

  test("three different states count 3; several visits to one state count once", () => {
    expect(countVisitedStates([visit("CA"), visit("NV"), visit("AZ")])).toBe(3);
    expect(countVisitedStates([visit("CA"), visit("CA", null, "2025-01-01"), visit("CA", "Fresno")])).toBe(1);
  });
});

describe("upcoming trips", () => {
  test("are soonest first, leave out ended trips and keep trips in progress", () => {
    const trips = [
      trip("Later", "2027-09-01", "2027-09-02", ["ME"]),
      trip("Ended", "2026-06-01", "2026-06-03", ["OR"]),
      trip("Now", "2026-10-19", "2026-10-21", ["TX"]),
      trip("Sooner", "2027-03-01", "2027-03-02", ["VT"]),
    ];
    expect(upcomingTrips(trips, TODAY).map((t) => t.name)).toEqual(["Now", "Sooner", "Later"]);
  });

  test("the years with upcoming trips, earliest first", () => {
    const trips = [
      trip("A", "2028-01-01", "2028-01-02", ["ME"]),
      trip("B", "2027-01-01", "2027-01-02", ["ME"]),
      trip("C", "2027-05-01", "2027-05-02", ["ME"]),
      trip("Ended", "2025-01-01", "2025-01-02", ["ME"]),
    ];
    expect(tripYears(trips, TODAY)).toEqual([2027, 2028]);
  });
});

describe("map colors", () => {
  test("all 50 states start unvisited", () => {
    const statuses = stateStatuses({ visits: [], trips: [] }, TODAY);
    expect(Object.keys(statuses)).toHaveLength(50);
    expect(new Set(Object.values(statuses))).toEqual(new Set(["unvisited"]));
  });

  test("a visited state is visited; a state in an upcoming trip is planned", () => {
    const statuses = stateStatuses(
      { visits: [visit("CA")], trips: [trip("Weekend", "2026-10-27", "2026-10-29", ["AZ", "UT"])] },
      TODAY,
    );
    expect([statuses.CA, statuses.AZ, statuses.UT, statuses.NV]).toEqual(["visited", "planned", "planned", "unvisited"]);
  });

  test("visited wins over planned", () => {
    const data = { visits: [visit("AZ")], trips: [trip("Weekend", "2026-10-27", "2026-10-29", ["AZ"])] };
    expect(stateStatuses(data, TODAY).AZ).toBe("visited");
  });

  test("a trip that has ended isn't planned; a trip in progress is", () => {
    expect(stateStatuses({ visits: [], trips: [trip("Ended", "2025-06-01", "2025-06-03", ["OR"])] }, TODAY).OR).toBe(
      "unvisited",
    );
    expect(stateStatuses({ visits: [], trips: [trip("Now", "2026-10-19", "2026-10-21", ["OR"])] }, TODAY).OR).toBe(
      "planned",
    );
  });

  test("the year filter only counts trips that start in that year", () => {
    const data = {
      visits: [],
      trips: [trip("Today", TODAY, TODAY, ["AZ"]), trip("Next year", "2027-03-01", "2027-03-03", ["UT"])],
    };
    const thisYear = stateStatuses(data, TODAY, 2026);
    const nextYear = stateStatuses(data, TODAY, 2027);
    expect([thisYear.AZ, thisYear.UT]).toEqual(["planned", "unvisited"]);
    expect([nextYear.AZ, nextYear.UT]).toEqual(["unvisited", "planned"]);
  });
});

describe("the year plan", () => {
  /** yearPlan() as { 2027: that year's plan }. */
  function plan(visits: Visit[], trips: Trip[], today = TODAY) {
    return Object.fromEntries(yearPlan({ visits, trips }, today).map((year) => [year.year, year]));
  }

  test("shows this year and the next two when there are no trips", () => {
    expect(yearPlan({ visits: [], trips: [] }, TODAY).map((y) => y.year)).toEqual([2026, 2027, 2028]);
  });

  test("shows more years when trips are planned further ahead", () => {
    const trips = [trip("Far away", "2030-06-01", "2030-06-03", ["HI"])];
    expect(yearPlan({ visits: [], trips }, TODAY).map((y) => y.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
  });

  test("a trip belongs to the year it starts in", () => {
    const years = plan([], [trip("New Year's", "2026-12-30", "2027-01-02", ["NY"])]);
    expect(years[2026].trips.map((t) => t.name)).toEqual(["New Year's"]);
    expect(years[2027].trips).toEqual([]);
  });

  test("a trip still going that started last year shows in this year", () => {
    const years = plan([], [trip("New Year's", "2025-12-30", "2026-01-02", ["NY"])], "2026-01-01");
    expect(years[2026].trips.map((t) => t.name)).toEqual(["New Year's"]);
  });

  test("trips in a year are soonest first, and ended trips are left out", () => {
    const years = plan([], [
      trip("Later", "2027-09-01", "2027-09-02", ["ME"]),
      trip("Sooner", "2027-03-01", "2027-03-02", ["VT"]),
      trip("Last summer", "2026-06-01", "2026-06-03", ["OR"]),
    ]);
    expect(years[2027].trips.map((t) => t.name)).toEqual(["Sooner", "Later"]);
    expect(years[2026].trips).toEqual([]);
  });

  test("new states leave out visited ones, A to Z by name", () => {
    const years = plan([visit("AZ")], [trip("Four Corners", "2027-03-01", "2027-03-03", ["AZ", "UT", "CO", "NM"])]);
    expect(years[2027].newStates).toEqual(["Colorado", "New Mexico", "Utah"]);
  });

  test("a state planned twice is new only in the first year", () => {
    const years = plan([], [
      trip("First", "2027-03-01", "2027-03-02", ["VT"]),
      trip("Again", "2028-03-01", "2028-03-02", ["VT", "NH"]),
    ]);
    expect(years[2027].newStates).toEqual(["Vermont"]);
    expect(years[2028].newStates).toEqual(["New Hampshire"]);
  });

  test("the total by the end of each year counts each state once", () => {
    const years = plan([visit("CA"), visit("AZ")], [
      trip("Four Corners", "2027-03-01", "2027-03-03", ["AZ", "UT"]),
      trip("New England", "2028-09-01", "2028-09-04", ["VT", "UT"]),
    ]);
    expect([years[2026].totalByEnd, years[2027].totalByEnd, years[2028].totalByEnd]).toEqual([2, 3, 4]);
  });
});

describe("city dots", () => {
  /** cityDots() as { "Denver, CO": dot }. */
  function dots(visits: Visit[], trips: Trip[], year?: number) {
    return Object.fromEntries(cityDots({ visits, trips }, TODAY, year).map((dot) => [`${dot.name}, ${dot.state}`, dot]));
  }

  test("visits without a city give no dots", () => {
    expect(dots([visit("CO")], [])).toEqual({});
  });

  test("a visited city gets a visited dot at the city's map position", () => {
    const dot = dots([visit("CO", "Denver")], [])["Denver, CO"];
    expect(dot.kind).toBe("visited");
    expect(dot.x).toBeGreaterThan(0);
    expect(dot.y).toBeGreaterThan(0);
  });

  test("a city in an upcoming trip gets an upcoming dot", () => {
    const trips = [trip("Weekend", "2026-10-27", "2026-10-29", ["NM"], [["Santa Fe", "NM"]])];
    expect(dots([], trips)["Santa Fe, NM"].kind).toBe("upcoming");
  });

  test("a city visited and upcoming shows as upcoming, with both details", () => {
    const trips = [trip("Four Corners weekend", "2026-10-27", "2026-10-29", ["CO"], [["Denver", "CO"]])];
    const dot = dots([visit("CO", "Denver")], trips)["Denver, CO"];
    expect(dot.kind).toBe("upcoming");
    expect(dot.visitDates).toEqual(["2024-07-04"]);
    expect(dot.trips).toEqual([{ name: "Four Corners weekend", startDate: "2026-10-27" }]);
  });

  test("a city from a trip that ended gets no dot", () => {
    const trips = [trip("Ended", "2025-06-01", "2025-06-03", ["OR"], [["Portland", "OR"]])];
    expect(dots([], trips)).toEqual({});
  });

  test("two visits to a city give one dot with both dates, oldest first", () => {
    const result = dots([visit("CO", "Denver", "2025-03-01"), visit("CO", "Denver", "2024-07-04")], []);
    expect(Object.keys(result)).toEqual(["Denver, CO"]);
    expect(result["Denver, CO"].visitDates).toEqual(["2024-07-04", "2025-03-01"]);
  });

  test("the year filter applies to upcoming dots but keeps visited dots", () => {
    const trips = [trip("Spring", "2027-04-02", "2027-04-05", ["CO", "NM"], [["Denver", "CO"], ["Santa Fe", "NM"]])];
    const visits = [visit("CO", "Denver")];
    expect(dots(visits, trips, 2026)["Santa Fe, NM"]).toBeUndefined();
    expect(dots(visits, trips, 2026)["Denver, CO"].kind).toBe("visited");
    expect(dots(visits, trips, 2027)["Denver, CO"].kind).toBe("upcoming");
  });

  test("a city that's no longer in the city list is skipped", () => {
    expect(dots([visit("CO", "Atlantis")], [])).toEqual({});
  });
});

describe("region cards", () => {
  /** regionSummaries() as { West: region }. */
  function regions(visits: Visit[], trips: Trip[], year?: number) {
    return Object.fromEntries(regionSummaries({ visits, trips }, TODAY, year).map((r) => [r.name, r]));
  }

  test("each region lists its states A to Z with full names", () => {
    const names = regions([], []).West.states.map((s) => s.name);
    expect(names).toEqual([...names].sort());
    expect(names).toContain("California");
  });

  test("an empty tracker has nothing visited or planned", () => {
    for (const region of Object.values(regions([], []))) {
      expect([region.visited, region.planned]).toEqual([0, 0]);
      expect(region.total).toBe(region.states.length);
    }
  });

  test("visits and trips are counted per region, with percentages", () => {
    const west = regions([visit("CA")], [trip("Weekend", "2026-10-27", "2026-10-29", ["OR"])]).West;
    expect([west.visited, west.planned, west.total]).toEqual([1, 1, 13]);
    expect([west.visitedPercent, west.plannedPercent]).toEqual([7.7, 7.7]);
    const status = (code: string) => west.states.find((s) => s.code === code)?.status;
    expect([status("CA"), status("OR"), status("WA")]).toEqual(["visited", "planned", "unvisited"]);
  });

  test("visited and planned counts as visited", () => {
    const west = regions([visit("CA")], [trip("Weekend", "2026-10-27", "2026-10-29", ["CA"])]).West;
    expect([west.visited, west.planned]).toEqual([1, 0]);
  });

  test("the year filter changes what counts as planned", () => {
    const trips = [trip("Spring", "2027-04-02", "2027-04-05", ["OR"])];
    expect(regions([], trips, 2026).West.planned).toBe(0);
    expect(regions([], trips, 2027).West.planned).toBe(1);
  });

  test("the city badge counts different visited cities, not trip cities", () => {
    const visits = [visit("CO", "Denver"), visit("CO", "Denver", "2025-03-01"), visit("CO", "Boulder", "2025-03-02")];
    const trips = [trip("Ski", "2026-10-27", "2026-10-29", ["CO"], [["Aspen", "CO"]])];
    expect(regions(visits, trips).West.states.find((s) => s.code === "CO")?.cityCount).toBe(2);
  });
});

describe("the next trip", () => {
  test("is the soonest one, with how far away it is", () => {
    const trips = [
      trip("Later", "2026-11-19", "2026-11-20", ["OR"]),
      trip("Sooner", "2026-10-30", "2026-11-01", ["TX"]),
    ];
    expect(nextTrip(trips, TODAY)).toMatchObject({ trip: { name: "Sooner" }, when: "in 10 days" });
  });

  test("says “tomorrow” and “happening now”", () => {
    expect(nextTrip([trip("Tomorrow", "2026-10-21", "2026-10-22", ["TX"])], TODAY)?.when).toBe("tomorrow");
    expect(nextTrip([trip("Now", "2026-10-19", "2026-10-21", ["OR"])], TODAY)?.when).toBe("happening now");
  });

  test("there is none when nothing is planned or everything ended", () => {
    expect(nextTrip([], TODAY)).toBeNull();
    expect(nextTrip([trip("Ended", "2025-06-01", "2025-06-03", ["OR"])], TODAY)).toBeNull();
  });
});
