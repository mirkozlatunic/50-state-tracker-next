// The "12 of 50" counter in the header. It reads the database, so the header
// shows it inside <Suspense> while the rest of the page is already there.

import { connection } from "next/server";
import { appDatabase } from "@/db/app";
import { visitedStateCount } from "@/db/queries";

export async function VisitedCounter() {
  // Wait for a real visitor: without this, the build could read the database
  // once and bake that number into the page forever.
  await connection();
  const count = await visitedStateCount(await appDatabase());
  return <CounterText>{`${count} of 50`}</CounterText>;
}

/** The counter's look, shared with the placeholder shown while it loads. */
export function CounterText({ children }: { children: string }) {
  return <span className="text-sm font-medium whitespace-nowrap tabular-nums text-muted-foreground">{children}</span>;
}
