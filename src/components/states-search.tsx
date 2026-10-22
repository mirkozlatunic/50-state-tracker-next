"use client";
// The states list with a search box: typing filters the list right away, by
// name ("new") or by two-letter code ("ny"). Two columns on phones.

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type StateRow = { code: string; name: string; visited: boolean };

/** The states matching what's typed: a name containing it, or exactly its code. */
function matching(states: StateRow[], typed: string): StateRow[] {
  const text = typed.trim().toLowerCase();
  if (!text) return states;
  return states.filter((state) => state.name.toLowerCase().includes(text) || state.code.toLowerCase() === text);
}

export function StatesSearch({ states }: { states: StateRow[] }) {
  const [typed, setTyped] = useState("");
  const shown = matching(states, typed);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Search states"
          placeholder="Search states…"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="pl-8"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-muted-foreground">No state matches “{typed.trim()}”.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-2 gap-y-1 lg:grid-cols-3">
          {shown.map((state) => (
            <li key={state.code} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted sm:gap-3">
              {/* The code only fits next to the name on bigger screens. */}
              <span className="hidden w-7 font-mono text-xs text-muted-foreground sm:inline">{state.code}</span>
              <Link href={`/states/${state.code}`} className="min-w-0 truncate hover:underline">
                {state.name}
              </Link>
              {state.visited && <Badge className="ml-auto shrink-0 bg-visited/15 text-visited-text">visited</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
