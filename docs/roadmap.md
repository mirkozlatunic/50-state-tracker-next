# Roadmap

Future ideas, written down so they aren't lost. **Plans only: none of this is
being built until it's asked for separately.** Each phase would follow the usual
way of working: a plan first, then one slice at a time, tests first.

## Phase 1: Persistent accounts and cross-device progress (mostly done)

Done in slice 13 (October 2026):

- Sign-in with an email code or Google, through Clerk.
- Each person's visits and trips live in the Turso database with their Clerk id
  (`user_id`), so the same account sees the same progress on every device.
- Rows from before accounts have no owner and show up for nobody.

Still open:

- **Clerk production app.** The live site runs on Clerk's free development app
  ("Development mode" badge, about 100 users). Real public sign-ups need a
  production app, a domain we own, and our own Google OAuth client. Accounts
  don't move from the development app to a production one, so people would
  sign up again; their data in Turso stays, but would need to be linked to the
  new account ids (a one-time script).
- **Deleting an account's data** when someone deletes their Clerk account
  (a Clerk webhook that removes their visits and trips).

## Phase 2: Visit memories

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

## Phase 3: Milestones and sharing (milestones done: slice 19)

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
