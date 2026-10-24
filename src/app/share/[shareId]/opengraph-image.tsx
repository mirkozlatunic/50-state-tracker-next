// The picture shown when a shared map's link is sent in a message (its "Open
// Graph" image, slice 20): the count and the map with the visited states, in
// the brand colors. Drawn on the server by next/og (part of Next.js).

import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { appDatabase } from "@/db/app";
import { sharedProgress } from "@/db/queries";
import { MAP_HEIGHT, MAP_WIDTH, STATE_PATHS } from "@/lib/data/map";
import { STATES } from "@/lib/data/states";

export const alt = "A map of the US states visited, made with 50 States Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  await connection(); // drawn fresh, never at build time
  // An unknown or stopped link still gets a picture, just an empty map with no count.
  const progress = await sharedProgress(await appDatabase(), (await params).shareId);
  const visited = new Set(progress?.visitedStates ?? []);
  // The map fills what's left of the 630 px height below the heading.
  const mapHeight = 460;
  const mapWidth = Math.round((mapHeight * MAP_WIDTH) / MAP_HEIGHT);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "#FBFAF7",
          color: "#16364B",
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 700 }}>
          {progress ? `${visited.size} of 50 states visited` : "50 States Tracker"}
        </div>
        <svg width={mapWidth} height={mapHeight} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
          {STATES.map(([code]) => (
            <path key={code} d={STATE_PATHS[code]} fill={visited.has(code) ? "#8FA28B" : "#E7EBE6"} stroke="#FFFFFF" strokeWidth={1} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
