@AGENTS.md

# 50 States Vacation Tracker (Next.js)

## Purpose

A small web app to track my trips through all 50 US states: which states I've
visited, when, and which weekend trips are planned next.
Private learning project. The data is my own real trip data.

This is the Next.js rewrite of the Flask app (`50-state-tracker`). Since
2026-10-22 it's the live app (https://50-state-tracker-next.vercel.app) on the
Turso database `tracker`; previews use `tracker-preview`. The Flask site stays
up as a fallback until 2026-11-05; switching it off needs my OK.

## About me

I'm learning. I know some Python and Flask; Next.js, React and TypeScript are
newer to me. Comment every function and explain new concepts in 1–2 sentences
when you use them. Prefer simple, readable code over clever code.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (Base UI),
lucide-react, next-themes, drizzle-orm + drizzle-kit, @libsql/client (Turso
online, a local SQLite file in development and tests), Server Actions + zod,
iron-session, @dnd-kit, Vitest, Playwright. Hosted on Vercel.
No other packages without asking me first.

## Setup and commands

- Install: `pnpm install`
- Set (or change) the app's password once: `pnpm set-password` in Terminal.app.
  It saves only a hash and a new session secret in `.env.local`; restart the app afterwards.
  Online, the same two values (PASSWORD_HASH, SESSION_SECRET) go in Vercel's settings.
- Run the app: `pnpm dev`, then open http://localhost:3000
- Checks (all must pass before a slice is done):
  `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` (Vitest),
  `pnpm test:e2e` (Playwright)
- `E2E_BUILT=1 pnpm test:e2e` (after `pnpm build`) runs the browser tests against the
  built app, like GitHub does (split over 3 machines); plain `pnpm test:e2e` uses the dev server.
- After a deploy: `pnpm test:live` checks the online site (no password needed).
- Keep the Mac awake and plugged in while the browser tests run; sleep makes them fail.

## Next.js / React conventions

- Read the guide in `node_modules/next/dist/docs/` before using a Next.js API.
- Middleware lives in `proxy.ts` in this Next.js version.
- Components with event handlers, hooks or browser APIs need `"use client"`.
- Use next/link `<Link>` for internal links, never raw `<a>` tags.
- Don't call setState synchronously inside useEffect; don't read refs during render.
- Every server component that reads the database calls `await connection()`
  (from next/server) first and sits inside `<Suspense>`; otherwise the build can
  read the data once and freeze it into the page.
- Buttons, fields, cards and pop-ups come from shadcn (`src/components/ui`).
  Use its sizes so buttons in a row line up; don't hand-roll button styles.

## The data

- The 50 states use their real official names and two-letter codes
  (e.g. California, CA). Washington, D.C. is not included.
- A visit has: state, visit date, a short note, and optionally a city.
- A planned trip has: a name, start date, end date, one or more states,
  and optionally cities.
- Cities come from the public-domain US Census Gazetteer files (carried over
  from the Flask app); cities are stored as name + state.
- Trips can be edited, deleted, or moved to another year.
- Visits can be edited (state, date, city, note) and deleted, from the state
  page. Editing follows the same rules as adding a visit.
- The map outlines come from a CC0 (public domain) Wikimedia Commons SVG.
- The tables match the Flask app (states, visits, trips, trip_states,
  trip_cities), so a Flask backup file imports straight into Turso.

## Hard rules

- There are exactly 50 states.
- A state can have several visits, but it counts only once in my progress.
- "Today" is the date in Los Angeles (America/Los_Angeles), not the server's UTC date.
- A visit date can't be in the future.
- A planned trip must start in the future, and its end date can't be before its start date.
- I can plan a trip to a state I've already visited.
- A state counts as "visited" when I've spent time there outside the airport.
  Layovers don't count.
- Editing a trip may keep its current start date even if that date has passed.
  Any other start date must be in the future.
- A trip belongs to the year it starts in. Trips that have ended are hidden.
- Moving a trip to another year keeps its month, day and length
  (Feb 29 becomes Feb 28 in a year without one). The trip rules still apply.
- Map colors: green = visited, orange = in a trip that hasn't ended,
  grey = neither. Visited wins over planned.
- Cities don't change the progress: it still counts states.
- A city must exist in the city list and be in its state. A trip's cities
  must be in one of the trip's states.
- City dots: dark green = visited city, blue = city in a trip that hasn't
  ended. A city that's both shows blue. One dot per city.
- Every city in the city list must land inside its own state's outline.
- One password for the whole app: log in once and every page opens; a device
  stays logged in for 30 days. Logged out, every page goes to /login, except
  the styles, icons and manifest.
- After 5 wrong passwords, logging in pauses for 1 minute.
- On phones (640px wide or less), `/map` shows the next trip and the four
  Census regions as cards instead of the map. Bigger screens keep the map.
- In every row of buttons, the buttons' vertical centers line up within 1px.

## Folder and secret rules

- Never commit `.env*` files, database files, the session secret or the
  password hash. Secrets live in Vercel's settings and a local `.env.local`.
- I type passwords myself; never put one in a command or a file.
- Tests use their own temporary database, never my real one.
- Don't put my computer's name in committed files.

## How we work

- Plan first, then code. Wait for my OK before writing code.
- Build one slice at a time. Write the tests first and show them to me
  before writing the code.
- Each slice: tests → code → all checks → screenshots (desktop, iPad 820px,
  iPhone 390px, light and dark) → a PR with a Vercel preview.
- Commit after each working slice, on a feature branch, then open a PR.
