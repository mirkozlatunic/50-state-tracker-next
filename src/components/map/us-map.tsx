// The US map: each state is a shape (an SVG <path>) colored by its status and
// linking to its state page, with the city dots on top. The dots are buttons
// laid over the drawing, placed as a share of its width and height.

import { CityDot } from "@/components/map/city-dot";
import { MAP_HEIGHT, MAP_WIDTH, STATE_PATHS } from "@/lib/data/map";
import { STATES, STATE_NAMES } from "@/lib/data/states";
import { dotDetails, dotPosition } from "@/lib/map-view";
import type { CityDot as Dot, StateStatus } from "@/lib/progress";

const FILL: Record<StateStatus, string> = {
  visited: "fill-visited",
  planned: "fill-planned",
  unvisited: "fill-unvisited",
};

export function UsMap({ statuses, dots }: { statuses: Record<string, StateStatus>; dots: Dot[] }) {
  return (
    <figure aria-label="Map of the 50 states" className="relative aspect-959/593 w-full">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0 size-full">
        {STATES.map(([code, name]) => (
          // An SVG link (<a> inside <svg>); next/link can't draw inside a drawing.
          <a key={code} href={`/states/${code}`} aria-label={name}>
            <path
              d={STATE_PATHS[code]}
              data-state={code}
              data-status={statuses[code]}
              className={`${FILL[statuses[code]]} stroke-map-stroke stroke-1 transition-opacity hover:opacity-80`}
            >
              <title>{name}</title>
            </path>
          </a>
        ))}
      </svg>
      {dots.map((dot) => (
        <CityDot
          key={`${dot.state}|${dot.name}`}
          label={`${dot.name}, ${dot.state}`}
          kind={dot.kind}
          details={dotDetails(dot)}
          stateCode={dot.state}
          stateName={STATE_NAMES[dot.state]}
          {...dotPosition(dot.x, dot.y)}
        />
      ))}
    </figure>
  );
}
