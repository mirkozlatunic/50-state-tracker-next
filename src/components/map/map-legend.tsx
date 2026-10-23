// What the map's colors and dots mean.

// The planned swatch: gold with the map's thin navy stripes.
const STRIPES =
  "bg-planned [background-image:repeating-linear-gradient(45deg,color-mix(in_srgb,var(--planned-foreground)_30%,transparent)_0_1.5px,transparent_1.5px_5px)]";

export function MapLegend({ year }: { year: number | null }) {
  const inYear = year ? ` in ${year}` : "";
  const swatch = "inline-block size-3.5 rounded-sm";
  const dot = "inline-block size-[9px] rounded-full ring-[1.5px] ring-dot-ring outline outline-border";
  return (
    <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <li className="flex items-center gap-2"><span className={`${swatch} bg-visited`} />Visited</li>
      <li className="flex items-center gap-2"><span data-stripes-swatch className={`${swatch} ${STRIPES}`} />{`Planned${inYear}`}</li>
      <li className="flex items-center gap-2"><span className={`${swatch} bg-unvisited`} />Not visited yet</li>
      <li className="flex items-center gap-2"><span className={`${dot} bg-dot-visited`} />Visited city</li>
      <li className="flex items-center gap-2">
        <span className="inline-block size-[9px] rounded-full bg-card ring-2 ring-dot-upcoming" />
        {`Upcoming city${inYear}`}
      </li>
    </ul>
  );
}
