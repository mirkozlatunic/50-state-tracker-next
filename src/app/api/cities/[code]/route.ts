// The city names of one state as JSON, e.g. ["Arvada", "Aurora", ...], for the
// city search box. Only works when logged in (proxy.ts checks every address).
// The lists never change, so all 50 are built once when the app is built.

import { notFound } from "next/navigation";
import { citiesInState } from "@/lib/cities";
import { STATES, STATE_CODES } from "@/lib/data/states";

/** Build the 50 lists ahead of time. */
export function generateStaticParams() {
  return STATES.map(([code]) => ({ code }));
}

export async function GET(_request: Request, { params }: RouteContext<"/api/cities/[code]">) {
  const { code } = await params;
  if (!STATE_CODES.has(code)) notFound();
  return Response.json(citiesInState(code).map((city) => city.name));
}
