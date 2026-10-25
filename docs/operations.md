# Running the 50 States Tracker

How to run the app on a computer, check it, set it up on Vercel, and look after
its data. What the app does is in the [README](../README.md). It replaces the
Flask app ([50-state-tracker](https://github.com/mirkozlatunic/50-state-tracker)).

## On the computer

```bash
pnpm install
pnpm dev            # then open http://localhost:3000
```

Signing in is [Clerk](https://clerk.com) (email code or Google). Put its two
keys from the Clerk dashboard (API keys) in `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

To try the account-deletion webhook on the computer too, add its signing
secret as `CLERK_WEBHOOK_SIGNING_SECRET` (see [Clerk settings](#clerk-settings)).

The computer uses its own database file, `local.sqlite` (git ignores it), and
keeps photos in a local folder (see [Photos](#photos)).

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm build
pnpm test        # unit tests (Vitest), each with its own temporary database
pnpm test:e2e    # browser tests (Playwright), desktop and iPhone sizes
E2E_BUILT=1 pnpm test:e2e   # the same, against the built app (after pnpm build), like GitHub
pnpm test:live   # checks against the online site (no account needed)
pnpm screenshots # the README's pictures (add E2E_BUILT=1 after pnpm build)
```

The browser tests sign in as two Clerk test people (`tracker-a+clerk_test@example.com`
and `tracker-b+…`), created in the Clerk app the first time. `+clerk_test`
addresses never get real email; their sign-in code is 424242. On GitHub the
checks need the same two Clerk keys as repository secrets
(`gh secret set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `gh secret set CLERK_SECRET_KEY`).
The webhook tests sign their own requests with a made-up secret, so GitHub
doesn't need the webhook's signing secret.

`pnpm screenshots` fills test person A's tracker with the landing page's sample
data in the tests' own database, then saves the landing page and the map at
computer and iPhone size, light and dark, in `docs/screenshots/`. Real data is
never used.

Keep the Mac awake and plugged in while the browser tests run; sleep makes them fail.
Now and then a test fails while signing in (Clerk's test sign-in timing out);
run that test file again on its own before treating it as a real failure.

## Settings on Vercel

Project → Settings → Environment Variables. Paste values without quotes, and
redeploy after changing one (settings only reach new deployments).

| Name | What it is | Production | Preview |
|---|---|---|---|
| `DATABASE_URL` | The Turso database address | `tracker` (real data) | `tracker-preview` (test data) |
| `DATABASE_AUTH_TOKEN` | Its token: `turso db tokens create <name>` | for `tracker` | for `tracker-preview` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys | Clerk production app | Clerk development app |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys | Clerk production app | Clerk development app |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk dashboard → Webhooks → the endpoint's Signing Secret (`whsec_…`) | yes | optional |
| `BLOB_READ_WRITE_TOKEN` | The photo store's key, added by Vercel when the Blob store was connected | `tracker-photos` | `tracker-photos` |

On the computer and in the tests, two more settings choose the photo store:
`PHOTO_STORE=local` keeps photos in a local folder even when a Blob key is
present, and `PHOTO_DIR` is that folder (`.photos` when it isn't set).

## Clerk settings

- **Who can sign up.** Clerk Dashboard → User & authentication → **Access mode**
  (https://dashboard.clerk.com/~/user-authentication/access-mode). **Invite-only**
  lets only invited people sign up: invite them under Users → Invitations →
  Invite user. **Open** lets anyone sign up.
- **Account deletion.** Clerk Dashboard → Webhooks → Add Endpoint, with the URL
  `https://50-state-tracker-next.vercel.app/api/webhooks/clerk` and the event
  `user.deleted`. Its Signing Secret goes in `CLERK_WEBHOOK_SIGNING_SECRET` on
  Vercel. When someone deletes their account (Manage account → Delete account),
  the app deletes their visits, trips, photos, settings and share link. The
  endpoint's Testing tab sends an example event; its reply should be 200.
- **Delete account** must be allowed for users, as the privacy page (`/privacy`)
  tells people to use it.

## Moving the data (from the Flask app, or from a backup)

A backup is one SQLite file with the same tables in both apps (plus `user_id`),
so it loads straight into Turso. Each person's backup holds only their own
visits and trips.

1. Download a backup: "Download backup" in the menu at the top right.
2. Create a database from it: `turso db create tracker --from-file ~/Downloads/tracker-YYYY-MM-DD.sqlite`
   (a new name if `tracker` already exists).
3. Point Production at it: change `DATABASE_URL` and `DATABASE_AUTH_TOKEN` on Vercel, then redeploy.
4. Run `pnpm test:live`, then sign in and look around. Rows from the Flask app
   (or from before accounts) have no owner yet (`user_id` is empty) and show
   up for nobody until they're given to someone.

## Photos

A visit can have up to 6 photos, and each person can upload up to 50 photos a
calendar month. Online they're in the private Vercel Blob store `tracker-photos`
(connected to Preview and Production; its key is the `BLOB_READ_WRITE_TOKEN`
setting Vercel added), in a folder per person (`photos/<user id>/`). On the
computer (`pnpm dev`) and in the tests they're saved in a local folder instead
(`.photos/`, which git ignores), so nothing touches the real store. The backup
lists where your photos are, but not the pictures themselves.

The free (Hobby) Blob plan allows 1 GB and 2,000 uploads a month; past a limit
it stops for 30 days (no charge). Each photo is two uploads (the photo and its
preview), which is why each person has a monthly limit.

## Logo and icons

The logo is the rope-ring badge, kept unchanged in `docs/brand/logo-source.png`.
`sh scripts/make-icons.sh` makes `public/logo.png` (the badge cropped to a square,
shown cut to a circle) and the browser and home-screen icons in `public/icons/`
from it, with macOS's built-in `sips`. Run it again if the source ever changes.

## iPhone home screen

Open the live address in Safari, sign in, then Share → Add to Home Screen. It
opens full screen on the map, with the name "50 States".
