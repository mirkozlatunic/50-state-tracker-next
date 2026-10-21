// Address checks that run in proxy.ts, before a page starts. A page sends its
// status (200, 404, ...) as soon as it starts streaming, so a "not found" has
// to be decided before that to get a real 404.

import { STATE_CODES } from "@/lib/data/states";

export type PathCheck = { kind: "ok" } | { kind: "redirect"; to: string } | { kind: "not-found" };

/** /states/CA opens, /states/ca goes to /states/CA, /states/DC is not found. */
export function checkStatePath(pathname: string): PathCheck {
  const match = /^\/states\/([^/]+)$/.exec(pathname);
  if (!match) return { kind: "ok" };
  const code = match[1].toUpperCase();
  if (!STATE_CODES.has(code)) return { kind: "not-found" };
  return code === match[1] ? { kind: "ok" } : { kind: "redirect", to: `/states/${code}` };
}
