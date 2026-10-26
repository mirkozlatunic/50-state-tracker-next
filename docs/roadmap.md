# Roadmap

Future ideas, written down so they aren't lost, and a record of the ones that
are done. **The open items are plans only: none of them is built until it's
asked for separately.** The done items record what was built. Each phase would
follow the usual way of working: a plan first, then one slice at a time, tests
first.

## Phase 1: Persistent accounts and cross-device progress (done, except the production app)

Done in slice 13 (October 2026):

- Sign-in through Clerk (at the time: an email code or Google).
- Each person's visits and trips live in the Turso database with their Clerk id
  (`user_id`), so the same account sees the same progress on every device.
- Rows from before accounts have no owner and show up for nobody.

Done in slices 23 and 24 (October 2026):

- **Deleting an account's data**: when someone deletes their Clerk account, a
  signed Clerk webhook (`/api/webhooks/clerk`) deletes their visits, trips,
  photos (rows and files), settings, share link and upload counts. A privacy
  page (`/privacy`) says what's stored and how to delete it.
- **Protecting the photo store**: sign-ups can be made invite-only in Clerk
  (Access mode → Invite-only), and each person can upload at most 50 photos a
  calendar month.

Still open: the Clerk production app (see [Still open](#still-open) below).

## Phase 2: Visit memories (done: slice 18, with a monthly limit in slice 23)

Built as planned below. Decided along the way: at most 6 photos per visit and
3 MB per file; the browser shrinks each photo to at most 2000 px (which also
drops its location data) and makes a 400 px preview; deleting a visit deletes
its photos; the backup lists where the photos are, not the pictures. Since
slice 23, each person can upload at most 50 photos a calendar month.

Optional photos and richer memories for a visit, without making the tracker
itself feel complicated.

- **What:** a visit already has a date, a note and a city. Add optional photos
  (a few per visit) and a longer note; the quick "add a visit" form stays as
  short as it is now, with memories added afterwards from the state page.
- **Storage:** photos in object storage (for example Vercel Blob), with only
  their address and size in the database: a new `visit_photos` table
  (`id`, `visit_id`, `user_id`, `url`, `width`, `height`, `created_at`).
  Photos are private to their owner, like visits.
- **Decide first:** a size and count limit per photo and visit, how photos are
  shrunk before upload (phones take large photos), and what deleting a visit
  does to its photos (delete them too).
- **Backup:** the backup file would list the photos' addresses; the photos
  themselves are too big for it.

## Phase 3: Milestones and sharing (done: slices 19 and 20)

Built as planned below. Decided along the way: the shared page shows nothing
besides the visited states and the count; links don't expire (until "Stop
sharing" or "Make a new link"); a reached milestone gets a calm gold card.

- **Milestones** at 10, 25 and 50 states: a small celebration the moment a
  visit reaches one, and the milestones you've reached on the home page. They
  can be worked out from the visits themselves, so no new table is needed;
  only "already celebrated" would be stored, so it shows once.
- **A shareable progress map:** a read-only page with a hard-to-guess link
  (`/share/<random id>`) that shows which states someone has visited, and
  nothing else (no dates, notes, cities or trips). Off until the person turns
  it on; they can turn it off or make a new link at any time. A picture of the
  map (made on the server) so it previews nicely in messages.
- **Decide first:** what exactly a shared page may show, and whether shared
  links expire.

## Also done (October 2026)

- **Slice 21:** a public landing page with sample data; the map is the first page after signing in.
- **Slices 22–22e:** the Google profile picture on the account button, the logo's name as a tooltip, a soft fade between light and dark, and fixes from four code reviews.
- **Slice 25:** the README as a showcase, with the setup in `docs/operations.md` and `pnpm screenshots`.
- **Slice 26:** the design rules moved from CLAUDE.md to `docs/design-rules.md`.
- **Slices 27 and 28: city photos.** A visited city shows a photo: the first
  photo (oldest upload) of my most recent visit to that city that has photos,
  reusing the 400 px previews (no new table or uploads). Slice 27 puts it in
  the city's map pop-up, loaded only when the pop-up opens. Slice 28 shows it
  on planned trips: each trip city I've visited gets its photo (small, if it
  has one) and "Visited <month year>" on `/trips`, the `/years` trip cards and,
  on phones, the next-trip card on `/map`. The shared page never shows photos,
  dates or cities.
- **Slice 29:** an "Add photos" button on each visit row of a state page, which
  opens the visit's page at its photos (left out once a visit has 6).
- **Slice 30:** photos while adding a visit: the add-visit form takes up to 6
  optional photos, uploaded right after the visit is saved. If one can't be
  added, the visit stays saved and the form says which photo and why.

## Still open

- **A Clerk production app.** The live site runs on Clerk's free development
  app ("Development mode" badge, about 100 users). Real public sign-ups need a
  production app, a domain we own, and our own Google OAuth client. Accounts
  don't move from the development app to a production one, so people would
  sign up again; their data in Turso stays, but would need to be linked to the
  new account ids (a one-time script).
- **Switching off the Flask site**: it stays up as a fallback until
  2026-11-05, and switching it off needs an explicit OK.
- **Photos in the backup**: the backup lists where the photos are, but not the
  pictures themselves.
- **A known edge case**: a very fast triple-click on the light/dark switch can
  switch twice on the third click (found in the slice 22d code review, left
  out on purpose).
