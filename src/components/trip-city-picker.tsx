"use client";
// A trip's cities: a search over the cities of every ticked state (shadcn
// Command in a Popover), and the chosen cities as chips you can remove. Each
// chip is also a hidden form field, e.g. cities = "Moab, UT".

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Each state's city names, kept after the first download (shared by all forms on the page).
const cityCache = new Map<string, string[]>();

/** How many matches to show at once. */
const MAX_MATCHES = 50;

/** The best matches for what's typed among "City, ST" labels: starting with it first, then containing it. */
function bestMatches(labels: string[], typed: string): string[] {
  const text = typed.trim().toLowerCase();
  if (!text) return labels.slice(0, MAX_MATCHES);
  const starts = labels.filter((label) => label.toLowerCase().startsWith(text));
  const contains = labels.filter((label) => !label.toLowerCase().startsWith(text) && label.toLowerCase().includes(text));
  return [...starts, ...contains].slice(0, MAX_MATCHES);
}

export function TripCityPicker({
  states,
  cities,
  onCitiesChange,
}: {
  states: string[];
  cities: string[];
  onCitiesChange: (cities: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [, setLoaded] = useState(0); // bumped when a list arrives, to draw it

  useEffect(() => {
    let current = true;
    for (const state of states) {
      if (cityCache.has(state)) continue;
      fetch(`/api/cities/${state}`)
        .then((response) => (response.ok ? response.json() : []))
        .then((names: string[]) => {
          cityCache.set(state, names);
          if (current) setLoaded((count) => count + 1);
        });
    }
    return () => {
      current = false;
    };
  }, [states]);

  const labels = states.flatMap((state) => (cityCache.get(state) ?? []).map((name) => `${name}, ${state}`));
  const matches = bestMatches(labels, typed).filter((label) => !cities.includes(label));

  return (
    <div className="flex flex-col gap-2">
      {cities.map((city) => (
        <input key={city} type="hidden" name="cities" value={city} />
      ))}
      {cities.length > 0 && (
        <ul aria-label="Trip cities" className="flex flex-wrap gap-1.5">
          {cities.map((city) => (
            <li key={city}>
              <Badge variant="secondary" className="h-7 gap-1 pr-0.5 pl-2.5 text-sm">
                {city}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${city}`}
                  onClick={() => onCitiesChange(cities.filter((other) => other !== city))}
                >
                  <X aria-hidden />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-label="Add a city"
              aria-expanded={open}
              disabled={states.length === 0}
              className="w-full justify-start font-normal sm:w-fit"
            />
          }
        >
          <Plus aria-hidden />
          {states.length ? "Add a city" : "Tick a state to add cities"}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          {/* shouldFilter={false}: we pick the matches ourselves (bestMatches). */}
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search cities…" value={typed} onValueChange={setTyped} className="text-base md:text-sm" />
            <CommandList>
              <CommandEmpty>No city found.</CommandEmpty>
              {matches.map((label) => (
                <CommandItem
                  key={label}
                  value={label}
                  onSelect={() => {
                    onCitiesChange([...cities, label]);
                    setTyped("");
                    setOpen(false);
                  }}
                >
                  {label}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
