// Independent lists the tests check the app's data against (copied from the
// Flask tests), so a test never compares the app's data with itself.

export const EXPECTED_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming",
};

// Every state's capital: each one must land inside its own state on the map.
export const CAPITALS: Record<string, string> = {
  AL: "Montgomery", AK: "Juneau", AZ: "Phoenix", AR: "Little Rock",
  CA: "Sacramento", CO: "Denver", CT: "Hartford", DE: "Dover",
  FL: "Tallahassee", GA: "Atlanta", HI: "Honolulu", ID: "Boise",
  IL: "Springfield", IN: "Indianapolis", IA: "Des Moines", KS: "Topeka",
  KY: "Frankfort", LA: "Baton Rouge", ME: "Augusta", MD: "Annapolis",
  MA: "Boston", MI: "Lansing", MN: "St. Paul", MS: "Jackson",
  MO: "Jefferson City", MT: "Helena", NE: "Lincoln", NV: "Carson City",
  NH: "Concord", NJ: "Trenton", NM: "Santa Fe", NY: "Albany",
  NC: "Raleigh", ND: "Bismarck", OH: "Columbus", OK: "Oklahoma City",
  OR: "Salem", PA: "Harrisburg", RI: "Providence", SC: "Columbia",
  SD: "Pierre", TN: "Nashville", TX: "Austin", UT: "Salt Lake City",
  VT: "Montpelier", VA: "Richmond", WA: "Olympia", WV: "Charleston",
  WI: "Madison", WY: "Cheyenne",
};
