// Slice 1: the list of US cities and where each one sits on the map
// (the same checks as the Flask app's test_cities.py).
import { describe, expect, test } from "vitest";
import { allCities, citiesInState, findCity } from "@/lib/cities";
import { MAP_HEIGHT, MAP_WIDTH } from "@/lib/data/map";
import { pointInState } from "@/lib/map-shapes";
import { CAPITALS, EXPECTED_STATES } from "./expected";

describe("the city list", () => {
  test("has tens of thousands of places", () => {
    expect(allCities().length).toBeGreaterThan(25000);
  });

  test("only has cities in the 50 states (no D.C., no Puerto Rico)", () => {
    expect(new Set(allCities().map((city) => city.state))).toEqual(new Set(Object.keys(EXPECTED_STATES)));
  });

  test("names are cleaned up (no ' city', ' CDP', ...)", () => {
    const endings = [" CDP", " city", " town", " village", " borough", "(balance)"];
    const leftovers = allCities().filter((city) => endings.some((end) => city.name.endsWith(end)));
    expect(leftovers).toEqual([]);
  });

  test("each name appears once per state", () => {
    const keys = allCities().map((city) => `${city.state}|${city.name.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every city is somewhere on the map", () => {
    const outside = allCities().filter(
      (city) => city.x < 0 || city.x > MAP_WIDTH || city.y < 0 || city.y > MAP_HEIGHT,
    );
    expect(outside).toEqual([]);
  });
});

describe("finding a city", () => {
  test("by name and state", () => {
    expect(findCity("Denver", "CO")).toMatchObject({ name: "Denver", state: "CO" });
  });

  test("ignores upper/lower case and extra spaces", () => {
    expect(findCity("  denver ", "co")?.name).toBe("Denver");
  });

  test.each([
    ["Honolulu", "HI"], // officially "Urban Honolulu"
    ["Nashville", "TN"], // officially "Nashville-Davidson"
    ["Louisville", "KY"], // officially "Louisville/Jefferson County"
    ["Boise", "ID"], // officially "Boise City"
    ["Anchorage", "AK"],
    ["Indianapolis", "IN"],
  ])("well-known short name %s, %s works", (name, state) => {
    expect(findCity(name, state)).not.toBeNull();
  });

  test("a name with a comma in it is read whole", () => {
    expect(findCity("Islamorada, Village of Islands", "FL")?.name).toBe("Islamorada, Village of Islands");
    expect(findCity("Lynchburg, Moore County", "TN")).not.toBeNull();
  });

  test("an unknown city, or a real city in the wrong state, gives null", () => {
    expect(findCity("Denvr", "CO")).toBeNull();
    expect(findCity("Honolulu", "CO")).toBeNull();
  });

  test("a state's cities are A to Z and only from that state", () => {
    const names = citiesInState("CO").map((city) => city.name);
    expect(names).toContain("Denver");
    expect(names).toEqual([...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
    expect(new Set(citiesInState("CO").map((city) => city.state))).toEqual(new Set(["CO"]));
  });
});

describe("where the cities land on the map", () => {
  test.each(Object.entries(CAPITALS))("the capital of %s, %s, is inside its state", (state, capital) => {
    const city = findCity(capital, state);
    expect(city).not.toBeNull();
    expect(pointInState(city!.x, city!.y, state)).toBe(true);
  });

  test.each([["Anchorage", "AK"], ["Fairbanks", "AK"], ["Hilo", "HI"]])(
    "%s, %s lands inside (Alaska and Hawaii are small insets)",
    (name, state) => {
      const city = findCity(name, state)!;
      expect(pointInState(city.x, city.y, state)).toBe(true);
    },
  );

  test("x grows to the east and y to the south", () => {
    const [seattle, denver, chicago, newYork] = [
      findCity("Seattle", "WA")!, findCity("Denver", "CO")!,
      findCity("Chicago", "IL")!, findCity("New York", "NY")!,
    ];
    expect(seattle.x < denver.x && denver.x < chicago.x && chicago.x < newYork.x).toBe(true);
    const [miami, atlanta] = [findCity("Miami", "FL")!, findCity("Atlanta", "GA")!];
    expect(chicago.y < atlanta.y && atlanta.y < miami.y).toBe(true);
  });

  test("a city is not inside a neighbouring state", () => {
    const denver = findCity("Denver", "CO")!;
    expect(pointInState(denver.x, denver.y, "KS")).toBe(false);
    expect(pointInState(denver.x, denver.y, "UT")).toBe(false);
  });

  test("the corner of the map is in no state", () => {
    expect(Object.keys(EXPECTED_STATES).some((code) => pointInState(1, 1, code))).toBe(false);
  });

  test("every city lands inside its own state", () => {
    const outside = allCities()
      .filter((city) => !pointInState(city.x, city.y, city.state))
      .map((city) => `${city.name}, ${city.state}`);
    expect(outside).toEqual([]);
  });
});
