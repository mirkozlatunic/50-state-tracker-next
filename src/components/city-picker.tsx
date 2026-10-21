"use client";
// The City box: a button that opens a search (shadcn Command in a Popover)
// over the chosen state's cities. The picked city goes into a hidden form field.

import { useEffect, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Each state's city names, kept after the first download.
const cityCache = new Map<string, string[]>();

/** How many matches to show at once (a state can have thousands of places). */
const MAX_MATCHES = 50;

/** The best matches for what's typed: names starting with it first, then names containing it. */
function bestMatches(names: string[], typed: string): string[] {
  const text = typed.trim().toLowerCase();
  if (!text) return names.slice(0, MAX_MATCHES);
  const starts = names.filter((name) => name.toLowerCase().startsWith(text));
  const contains = names.filter((name) => !name.toLowerCase().startsWith(text) && name.toLowerCase().includes(text));
  return [...starts, ...contains].slice(0, MAX_MATCHES);
}

export function CityPicker({
  state,
  city,
  onCityChange,
}: {
  state: string;
  city: string;
  onCityChange: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  // The downloaded lists, by state; a new list arriving re-draws the box.
  const [lists, setLists] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!state || cityCache.has(state)) return;
    let current = true;
    fetch(`/api/cities/${state}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((names: string[]) => {
        cityCache.set(state, names);
        if (current) setLists((before) => ({ ...before, [state]: names }));
      });
    return () => {
      current = false; // the state changed before the list arrived
    };
  }, [state]);

  const names = lists[state] ?? cityCache.get(state) ?? [];
  const matches = bestMatches(names, typed); // quick: a few thousand names at most

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name="city" value={city} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-labelledby="city-label"
              aria-expanded={open}
              disabled={!state}
              className="flex-1 justify-between font-normal"
            />
          }
        >
          <span className={city ? "" : "text-muted-foreground"}>
            {city || (state ? "Choose a city (optional)" : "Choose a state first")}
          </span>
          <ChevronsUpDown className="opacity-50" aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) p-0" align="start">
          {/* shouldFilter={false}: we pick the matches ourselves (bestMatches). */}
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search cities…" value={typed} onValueChange={setTyped} className="text-base md:text-sm" />
            <CommandList>
              <CommandEmpty>No city found.</CommandEmpty>
              {matches.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onCityChange(name);
                    setTyped("");
                    setOpen(false);
                  }}
                >
                  {name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {city && (
        <Button type="button" variant="ghost" size="icon" aria-label="Remove city" onClick={() => onCityChange("")}>
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}
