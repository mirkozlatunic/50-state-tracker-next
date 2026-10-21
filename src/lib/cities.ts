// The list of US cities and their positions on the map.
//
// It lives in src/lib/data/us_cities.csv, built once (by the Flask app's
// scripts/build_cities.py) from the public-domain US Census Gazetteer files.
// It never changes while the app runs, so it's read once into memory instead
// of being copied into the database. Server-only: it reads a file.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type City = { state: string; name: string; x: number; y: number };

const CITIES_FILE = join(process.cwd(), "src/lib/data/us_cities.csv");

// One CSV row: state, name (plain, or in quotes with "" for a quote), x, y.
const CSV_LINE = /^([A-Z]{2}),(?:"((?:[^"]|"")*)"|([^,]*)),([^,]+),([^,]+)$/;

// Filled the first time a city is needed.
let cities: City[] | null = null;
let byKey: Map<string, City> | null = null;
const byState = new Map<string, City[]>();

/** The lookup key for a city: state plus lower-case name, e.g. "CO|denver". */
function keyOf(name: string, state: string): string {
  return `${state.trim().toUpperCase()}|${name.trim().toLowerCase()}`;
}

/** Every city, read from the CSV the first time it's needed. */
export function allCities(): City[] {
  if (!cities) {
    const [, ...lines] = readFileSync(CITIES_FILE, "utf8").trim().split("\n");
    cities = lines.map((line) => {
      // A few names contain a comma, so they're in quotes: FL,"Islamorada, Village of Islands",792.2,565.6
      const [, state, quoted, plain, x, y] = CSV_LINE.exec(line.trim()) ?? [];
      const name = quoted !== undefined ? quoted.replaceAll('""', '"') : plain;
      return { state, name, x: Number(x), y: Number(y) };
    });
  }
  return cities;
}

/** The city called `name` in that state, or null. Case and extra spaces don't matter. */
export function findCity(name: string, state: string): City | null {
  byKey ??= new Map(allCities().map((city) => [keyOf(city.name, city.state), city]));
  return byKey.get(keyOf(name, state)) ?? null;
}

/** All cities in one state, A to Z (ignoring upper/lower case). */
export function citiesInState(state: string): City[] {
  let list = byState.get(state);
  if (!list) {
    list = allCities()
      .filter((city) => city.state === state)
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    byState.set(state, list);
  }
  return list;
}
