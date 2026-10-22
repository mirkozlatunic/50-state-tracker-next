// Small helpers for the years page.

/** The years a trip card's "Move to" menu offers: every year on the page except the card's own column. */
export function moveChoices(years: readonly number[], current: number): number[] {
  return years.filter((year) => year !== current);
}
