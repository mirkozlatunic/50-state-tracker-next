// What the map's colors and dots mean.

export function MapLegend({ year }: { year: number | null }) {
  const inYear = year ? ` in ${year}` : "";
  const swatch = "inline-block size-3.5 rounded-sm";
  const dot = "inline-block size-[9px] rounded-full ring-[1.5px] ring-dot-ring outline outline-border";
  return (
    <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <li className="flex items-center gap-2"><span className={`${swatch} bg-visited`} />Visited</li>
      <li className="flex items-center gap-2"><span className={`${swatch} bg-planned`} />{`Planned${inYear}`}</li>
      <li className="flex items-center gap-2"><span className={`${swatch} bg-unvisited`} />Not visited yet</li>
      <li className="flex items-center gap-2"><span className={`${dot} bg-dot-visited`} />Visited city</li>
      <li className="flex items-center gap-2"><span className={`${dot} bg-dot-upcoming`} />{`Upcoming city${inYear}`}</li>
    </ul>
  );
}
