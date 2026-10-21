// The four US Census Bureau regions, used for the region cards on phones.
//
// Source: the Census Bureau's official "Census Regions and Divisions of the
// United States". Washington, D.C. (part of the South) is left out.

export const REGIONS: readonly { name: string; codes: readonly string[] }[] = [
  { name: "Northeast", codes: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"] },
  { name: "Midwest", codes: ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"] },
  { name: "South", codes: ["DE", "FL", "GA", "MD", "NC", "SC", "VA", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"] },
  { name: "West", codes: ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"] },
];
