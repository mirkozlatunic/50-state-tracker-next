// Geometry for the map outlines: "is this point inside that state?".
// The outlines are SVG paths made only of straight lines, so each state is one
// or more polygons (lists of corner points).

import { STATE_PATHS } from "@/lib/data/map";

type Point = [number, number];

// A command letter, or a number such as 15.8, -.3 or 2e-1.
const TOKEN = /[MmLlHhVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/** Turn an SVG path into a list of polygons. Only the commands the map uses are
 * handled: M/m (move), L/l (line), H/h and V/v (horizontal/vertical line) and
 * Z/z (close). Lower-case letters mean "relative to the current point". */
export function parsePath(d: string): Point[][] {
  const tokens = d.match(TOKEN) ?? [];
  const polygons: Point[][] = [];
  let current: Point[] = [];
  let x = 0, y = 0, startX = 0, startY = 0;
  let command = "";
  let i = 0;
  const next = () => Number(tokens[i++]);

  while (i < tokens.length) {
    const token = tokens[i];
    if (/^[A-Za-z]$/.test(token)) {
      command = token;
      i++;
      if (command === "Z" || command === "z") {
        if (current.length) polygons.push(current);
        current = [];
        [x, y] = [startX, startY];
      }
      continue;
    }
    if (command === "M" || command === "m") {
      const [dx, dy] = [next(), next()];
      [x, y] = command === "m" ? [x + dx, y + dy] : [dx, dy];
      if (current.length) polygons.push(current);
      current = [[x, y]];
      [startX, startY] = [x, y];
      // Numbers after the first pair of a move are lines, in the same style.
      command = command === "m" ? "l" : "L";
    } else if (command === "L" || command === "l") {
      const [dx, dy] = [next(), next()];
      [x, y] = command === "l" ? [x + dx, y + dy] : [dx, dy];
      current.push([x, y]);
    } else if (command === "H" || command === "h") {
      const value = next();
      x = command === "h" ? x + value : value;
      current.push([x, y]);
    } else if (command === "V" || command === "v") {
      const value = next();
      y = command === "v" ? y + value : value;
      current.push([x, y]);
    } else {
      throw new Error(`Unsupported path command: ${command}`);
    }
  }
  if (current.length) polygons.push(current);
  return polygons;
}

// Each state's polygons, worked out the first time they're needed.
const polygonCache = new Map<string, Point[][]>();

/** The polygons of one state's outline. */
function statePolygons(code: string): Point[][] {
  let polygons = polygonCache.get(code);
  if (!polygons) {
    polygons = STATE_PATHS[code] ? parsePath(STATE_PATHS[code]) : [];
    polygonCache.set(code, polygons);
  }
  return polygons;
}

/** Ray casting: draw a line from the point to the right and count how often it
 * crosses the polygon's edges. An odd count means the point is inside. */
function pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[j];
    if (y1 > y !== y2 > y && x < x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)) inside = !inside;
  }
  return inside;
}

/** True if the map point (x, y) is inside the outline of the state with this code. */
export function pointInState(x: number, y: number, code: string): boolean {
  return statePolygons(code).some((polygon) => pointInPolygon(x, y, polygon));
}
