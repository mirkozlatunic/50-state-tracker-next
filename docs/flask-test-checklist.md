# Flask test checklist

The Flask app had 416 tests (319 test functions; some run once per state or
per page). This list maps each Flask test file to the tests that cover the same
rules in the Next.js app, and names everything that's deliberately different.

- **unit** = `tests/unit/…` (Vitest, no browser)
- **e2e** = `tests/e2e/…` (Playwright, desktop and iPhone)

## Covered, rule for rule

| Flask file (tests) | Covered by | Notes |
|---|---|---|
| `test_states.py` (8) | unit `data`, `db`, `visits-db`, `queries`; e2e `visits` | 50 states with official names, no D.C., A to Z, setup safe to run twice, "0 of 50". |
| `test_setup.py` (3) | unit `db-helpers` (temporary database per test); e2e `visits` (`/` opens `/states`) | |
| `test_visits.py` (17) | unit `rules`, `visit-form`; e2e `visits` | Future date, impossible date, no state, D.C., today allowed, layover hint, placeholder, keeps what you typed. |
| `test_progress.py` (5) | unit `progress`, `queries`; e2e `shell`, `visits` | 3 states = "3 of 50", several visits count once, a refused visit doesn't count. |
| `test_state_detail.py` (12) | unit `routes`, `visits-db`; e2e `visits` | Newest first, only that state's visits, notes as text, lower-case codes, 404 for D.C., "Add a visit" picks the state. |
| `test_visit_edit.py` (17) | unit `visits-db`; e2e `visits`; unit `progress` (dots and counts follow the data) | Edit state/date/city/note, remove a city, refuse a future date, delete with "Are you sure?". |
| `test_trips.py` (26) | unit `rules`, `trip-form`, `trips-db`, `progress`; e2e `trips` | Every trip rule, same state twice saved once, soonest first, ended trips hidden. |
| `test_trip_edit.py` (18) | unit `rules`, `trips-db`; e2e `trips` | Keeping a passed start date, renaming a trip in progress, delete keeps visits. |
| `test_years.py` (21) | unit `progress`, `trip-form`; e2e `years`, `trips` | Year columns, new states, running total, "Plan a trip in YEAR", back to `/years`. |
| `test_move_trip.py` (17) | unit `dates`, `rules`, `trips-db`; e2e `years` | Same month/day/length, Feb 29 → Feb 28, never into the past, moves show on `/trips` and the map. |
| `test_map.py` (17) | unit `data`, `progress`; e2e `map` | Colors, visited wins, ended/in-progress trips, year filter, legend, state names on hover. |
| `test_city_dots.py` (20) | unit `progress`, `map-view`; e2e `map` | Dot kinds, one dot per city, year filter, dots on top, details on hover/tap, visible in dark mode. |
| `test_regions.py` (20) | unit `data`, `progress`; e2e `map` | Four regions, counts and bars, chips with city counts, next trip card, cards on phones and map on bigger screens. |
| `test_cities.py` (16) | unit `cities` | Same list, every city inside its own state, short names, quoted names. |
| `test_city_fields.py` (23) | unit `rules`, `visit-form`, `trip-form`, `trips-db`; e2e `visits`, `trips` | City search per state, official spelling, "City, ST" rules, moving a trip keeps its cities. |
| `test_theme.py` (12) | e2e `shell` | Follows the device, the switch changes the theme, the choice stays after a reload, colors really change. |
| `test_layout.py` (10) | e2e `shell`, `visits`, `trips`, `years`, `map` | Two-row header on phones, 16px form text, 44px tap targets, no sideways scrolling, two-column checkboxes, stacked/two-by-two years. |
| `test_home_screen.py` (9) | e2e `home-screen`, `shell` | Manifest, icon sizes, `/favicon.ico`, full screen as "50 States", top bar color in both themes. |
| `test_login.py` (24) | unit `password`, `access`, `lockout`, `env-file`, `actions-guard`; e2e `login`, `home-screen`, `visits` | One login for every page, 30 days, `?next=` only to this app, 5 wrong tries then a minute, no password = setup page, backup download, a form sent after the login ran out saves nothing. |

## Deliberately different

| Flask test(s) | Why it's different now |
|---|---|
| CSRF tests in `test_login.py` (hidden code on every form, refused without it) | Next.js form actions only accept requests from this site by themselves, so there's no hidden code to test. Every action also checks the login first (`actions-guard` test). |
| `test_theme.py`: theme saved in a cookie, junk cookie ignored, colors defined once as CSS variables | `next-themes` remembers the choice in the browser instead of a cookie. Colors are theme tokens in `globals.css` (shadcn's setup); the e2e tests check what you see, not the CSS text. |
| `test_regions.py`: "the default comes before the phone rule" | That guarded a CSS ordering bug in Flask's hand-written stylesheet. Tailwind classes can't have that bug; e2e checks which view shows on each screen size. |
| `test_city_dots.py`: hidden details box and `map.js` first-tap script | Dots are now buttons with a shadcn Popover: a tap or hover opens the details right at the dot. e2e checks the details and the "Open Colorado →" link. |
| `test_move_trip.py`: `draggable="true"` and `years.js` | Dragging uses dnd-kit and is tested for real: with a mouse, and with a finger on the iPhone. |
| `test_city_fields.py`: three city rows and "Add another city" | Trip cities are picked from a search and shown as removable chips. The same "City, ST" rules apply on the server. |
| `test_city_fields.py`: an old database gets the `city` column | Every Flask backup made since cities were added already has that column, and the import copies the tables as they are. |
| `test_deploy.py` (4): pinned requirements, WSGI file, `set-password` keeps the https setting | PythonAnywhere only. Vercel installs from `pnpm-lock.yaml`, and the https-only cookie follows from running in production. |
| `test_login.py`: `set-password` writes `instance/config.py`, tests never read the real config | `pnpm set-password` writes `.env.local` (unit `env-file`); tests use their own made-up password and database (`tests/e2e/helpers.ts`). |
| Status codes for unknown visits and trips (Flask: 404) | The page shows "Not found" (marked so search engines skip it), but the status is 200, because the page has already started loading when the database answers. Unknown states still get a real 404. |

## Added beyond Flask

- Buttons in a row line up within 1px, measured (header, footer, Edit/Delete, "Move to", form buttons).
- Dragging trips with a finger on the iPhone.
- The 5-wrong-passwords pause survives between requests (it's kept in the database).
- The backup file was loaded into a real Turso database and checked (slice 8).
