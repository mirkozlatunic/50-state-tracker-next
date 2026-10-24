// The made-up tracker shown on the landing page (slice 21), so people can see
// what the app looks like before they sign in. It's not anyone's real data and
// never touches the database, but it follows the same rules as real visits
// and trips (tests/unit/demo-data.test.ts), so the same map code can draw it.

import type { TrackerData, Trip, Visit } from "@/lib/progress";

// 18 states, with a real city in each (from the city list). California has two
// visits, to show that a state counts once.
const VISITS: Visit[] = [
  { state: "CA", visitDate: "2019-06-14", city: "San Francisco" },
  { state: "CA", visitDate: "2024-03-02", city: "Los Angeles" },
  { state: "NV", visitDate: "2019-06-20", city: "Las Vegas" },
  { state: "AZ", visitDate: "2020-02-11", city: "Phoenix" },
  { state: "UT", visitDate: "2020-09-05", city: "Salt Lake City" },
  { state: "CO", visitDate: "2021-01-16", city: "Denver" },
  { state: "NM", visitDate: "2021-05-29", city: "Santa Fe" },
  { state: "TX", visitDate: "2021-11-12", city: "Austin" },
  { state: "LA", visitDate: "2022-02-26", city: "New Orleans" },
  { state: "FL", visitDate: "2022-04-09", city: "Miami" },
  { state: "GA", visitDate: "2022-08-20", city: "Atlanta" },
  { state: "TN", visitDate: "2022-10-15", city: "Nashville" },
  { state: "IL", visitDate: "2023-03-18", city: "Chicago" },
  { state: "NY", visitDate: "2023-07-04", city: "New York" },
  { state: "MA", visitDate: "2023-09-30", city: "Boston" },
  { state: "PA", visitDate: "2024-05-25", city: "Philadelphia" },
  { state: "WA", visitDate: "2024-08-10", city: "Seattle" },
  { state: "OR", visitDate: "2024-08-13", city: "Portland" },
  { state: "HI", visitDate: "2025-01-04", city: "Honolulu" },
];

/** `date` (YYYY-MM-DD) moved `days` days later. Date.UTC avoids time zone surprises. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** The sample tracker as of `today`: fixed past visits, and two trips that
 * always lie ahead (3 and 10 weeks from today), so they're never "ended". */
export function demoData(today: string): TrackerData {
  const trips: Trip[] = [
    {
      id: 1,
      name: "Big Sky road trip",
      startDate: addDays(today, 21),
      endDate: addDays(today, 27),
      states: ["MT", "WY", "ID"],
      cities: [
        { name: "Bozeman", state: "MT" },
        { name: "Jackson", state: "WY" },
      ],
    },
    {
      id: 2,
      name: "Maine weekend",
      startDate: addDays(today, 70),
      endDate: addDays(today, 72),
      states: ["ME"],
      cities: [{ name: "Portland", state: "ME" }],
    },
  ];
  return { visits: VISITS, trips };
}
