# 50 States Tracker

Track trips through all 50 US states: which states I've visited, when, and
which trips are planned next. Next.js + shadcn/ui, with the data in Turso
(hosted SQLite), hosted on Vercel. It replaces the Flask app
([50-state-tracker](https://github.com/mirkozlatunic/50-state-tracker)).

Live: https://50-state-tracker-next.vercel.app

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

The computer uses its own database file, `local.sqlite` (git ignores it).

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm build
pnpm test        # unit tests (Vitest), each with its own temporary database
pnpm test:e2e    # browser tests (Playwright), desktop and iPhone sizes
E2E_BUILT=1 pnpm test:e2e   # the same, against the built app (after pnpm build), like GitHub
pnpm test:live   # checks against the online site (no account needed)
```

The browser tests sign in as two Clerk test people (`tracker-a+clerk_test@example.com`
and `tracker-b+…`), created in the Clerk app the first time. `+clerk_test`
addresses never get real email; their sign-in code is 424242. On GitHub the
checks need the same two Clerk keys as repository secrets
(`gh secret set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `gh secret set CLERK_SECRET_KEY`).

Keep the Mac awake and plugged in while the browser tests run; sleep makes them fail.

## Settings on Vercel

Project → Settings → Environment Variables. Paste values without quotes, and
redeploy after changing one (settings only reach new deployments).

| Name | What it is | Production | Preview |
|---|---|---|---|
| `DATABASE_URL` | The Turso database address | `tracker` (real data) | `tracker-preview` (test data) |
| `DATABASE_AUTH_TOKEN` | Its token: `turso db tokens create <name>` | for `tracker` | for `tracker-preview` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys | Clerk production app | Clerk development app |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys | Clerk production app | Clerk development app |

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

A visit can have up to 6 photos. Online they're in the private Vercel Blob
store `tracker-photos` (connected to Preview and Production; its key is the
`BLOB_READ_WRITE_TOKEN` setting Vercel added). On the computer (`pnpm dev`) and
in the tests they're saved in a local folder instead (`.photos/`, which git
ignores), so nothing touches the real store. The backup lists where your photos
are, but not the pictures themselves.

## Logo and icons

The logo is the rope-ring badge, kept unchanged in `docs/brand/logo-source.png`.
`sh scripts/make-icons.sh` makes `public/logo.png` (the badge cropped to a square,
shown cut to a circle) and the browser and home-screen icons in `public/icons/`
from it, with macOS's built-in `sips`. Run it again if the source ever changes.

## iPhone home screen

Open the live address in Safari, sign in, then Share → Add to Home Screen. It
opens full screen on the map, with the name "50 States".
