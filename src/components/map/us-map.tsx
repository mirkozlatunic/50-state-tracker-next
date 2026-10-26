// The US map: each state is a shape (an SVG <path>) colored by its status and
// linking to its state page (states in an upcoming trip are also striped),
// with the city dots on top. The dots are buttons
// laid over the drawing, placed as a share of its width and height.

import { CityDot } from "@/components/map/city-dot";
import { MAP_HEIGHT, MAP_WIDTH, STATE_PATHS } from "@/lib/data/map";
import { STATES, STATE_NAMES } from "@/lib/data/states";
import { cityPhotoAlt, dotDetails, dotPosition } from "@/lib/map-view";
import { photoSrc } from "@/lib/photos";
import type { CityDot as Dot, StateStatus } from "@/lib/progress";

// The striped pattern's id (an SVG pattern is used by its id).
const STRIPES_ID = "planned-stripes";

const FILL: Record<StateStatus, string> = {
  visited: "fill-visited",
  planned: "fill-planned",
  unvisited: "fill-unvisited",
};

/** `linked`: each state (and city dot) links to its page (false on a shared map
 * or the landing page, where those pages are private). */
export function UsMap({ statuses, dots, linked = true }: { statuses: Record<string, StateStatus>; dots: Dot[]; linked?: boolean }) {
  return (
    <figure aria-label="Map of the 50 states" className="relative aspect-959/593 w-full">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0 size-full">
        <defs>
          {/* Thin navy diagonal stripes, laid over states in an upcoming trip. */}
          <pattern id={STRIPES_ID} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="7" className="fill-planned-foreground opacity-30" />
          </pattern>
        </defs>
        {STATES.map(([code, name]) => {
          const shape = (
            <path
              key={code}
              d={STATE_PATHS[code]}
              data-state={code}
              data-status={statuses[code]}
              className={`${FILL[statuses[code]]} stroke-map-stroke stroke-1 ${linked ? "transition-opacity hover:opacity-80" : ""}`}
            >
              <title>{name}</title>
            </path>
          );
          // An SVG link (<a> inside <svg>); next/link can't draw inside a drawing.
          return linked ? (
            <a key={code} href={`/states/${code}`} aria-label={name}>
              {shape}
            </a>
          ) : (
            shape
          );
        })}
        {/* The stripes go on top of the planned states, so planned doesn't rely
            on the gold color alone. Clicks go through them to the state below. */}
        <g aria-hidden className="pointer-events-none">
          {STATES.filter(([code]) => statuses[code] === "planned").map(([code]) => (
            <path key={code} d={STATE_PATHS[code]} data-stripes={code} fill={`url(#${STRIPES_ID})`} className="pointer-events-none" />
          ))}
        </g>
      </svg>
      {dots.map((dot) => (
        <CityDot
          key={`${dot.state}|${dot.name}`}
          label={`${dot.name}, ${dot.state}`}
          kind={dot.kind}
          details={dotDetails(dot)}
          stateCode={dot.state}
          stateName={STATE_NAMES[dot.state]}
          linked={linked}
          // Only the map page's dots have photos (never the shared map's or the landing page's).
          photo={
            dot.photo && {
              src: photoSrc(dot.photo.id, dot.photo.version, "thumb"),
              alt: cityPhotoAlt(dot, dot.photo.visitDate),
              visitDate: dot.photo.visitDate,
            }
          }
          {...dotPosition(dot.x, dot.y)}
        />
      ))}
    </figure>
  );
}
