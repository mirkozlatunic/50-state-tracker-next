// Saving a trip straight into a test database (the trip forms come in slice 5).
import { eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { states, tripCities, trips, tripStates } from "@/db/schema";
import type { TripCity } from "@/lib/rules";

/** Save a trip for the person `userId`, with its states and cities; returns its id. */
export async function addTripForTest(
  db: Database,
  userId: string,
  trip: { name: string; startDate: string; endDate: string; states: string[]; cities?: TripCity[] },
): Promise<number> {
  const [{ id }] = await db.insert(trips).values({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate, userId }).returning();
  const rows = await db.select().from(states).where(inArray(states.code, trip.states));
  await db.insert(tripStates).values(rows.map((state) => ({ tripId: id, stateId: state.id })));
  for (const city of trip.cities ?? []) {
    const [state] = await db.select().from(states).where(eq(states.code, city.state));
    await db.insert(tripCities).values({ tripId: id, stateId: state.id, city: city.name });
  }
  return id;
}
