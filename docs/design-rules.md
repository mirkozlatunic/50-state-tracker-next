# Design rules

The detailed look-and-feel rules for the 50 States Tracker. They're part of
the project's instructions: CLAUDE.md pulls this file in with
`@docs/design-rules.md`, so they apply exactly as if they were written there.

## Components

- Buttons, fields, cards and pop-ups come from shadcn (`src/components/ui`).
  Use its sizes so buttons in a row line up; don't hand-roll button styles.

## Map and colors

- Map colors (brand palette): sage = visited, gold = in a trip that hasn't
  ended (also striped), pale grey-green = neither. Visited wins over planned.
  Status never relies on color alone (stripes, check marks, words for screen readers).
- City dots: solid navy (light in dark mode) = visited city, hollow with a
  gold ring = city in a trip that hasn't ended. A city that's both shows the
  gold ring. One dot per city.
- Brand palette (src/app/globals.css): navy #16364B, sage #8FA28B, gold
  #F1B84A, warm off-white #FBFAF7, plus a matching dark theme. Text on gold is
  navy; every text color passes 4.5 : 1 contrast (tests/unit/palette.test.ts).

## Layout

- On phones (640px wide or less), `/map` shows the next trip and the four
  Census regions as cards instead of the map. Bigger screens keep the map.
- In every row of buttons, the buttons' vertical centers line up within 1px.
