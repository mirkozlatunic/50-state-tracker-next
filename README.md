# 50 States Tracker

Track trips through all 50 US states: which states I've visited, when, and
which trips are planned next. Next.js + shadcn/ui, with the data in Turso
(hosted SQLite), hosted on Vercel. It replaces the Flask app
([50-state-tracker](https://github.com/mirkozlatunic/50-state-tracker)).

Live: https://50-state-tracker-next.vercel.app

## On the computer

```bash
pnpm install
pnpm set-password   # once, in Terminal.app; saves a hash in .env.local
pnpm dev            # then open http://localhost:3000
```

The computer uses its own database file, `local.sqlite` (git ignores it).

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm build
pnpm test        # unit tests (Vitest), each with its own temporary database
pnpm test:e2e    # browser tests (Playwright), desktop and iPhone sizes
pnpm test:live   # checks against the online site (no password needed)
```

Keep the Mac awake and plugged in while the browser tests run; sleep makes them fail.

## Settings on Vercel

Project → Settings → Environment Variables. Paste values without quotes, and
redeploy after changing one (settings only reach new deployments).

| Name | What it is | Production | Preview |
|---|---|---|---|
| `DATABASE_URL` | The Turso database address | `tracker` (real data) | `tracker-preview` (test data) |
| `DATABASE_AUTH_TOKEN` | Its token: `turso db tokens create <name>` | for `tracker` | for `tracker-preview` |
| `PASSWORD_HASH` | From `.env.local` after `pnpm set-password` | same | same |
| `SESSION_SECRET` | From `.env.local` after `pnpm set-password` | same | same |

## Moving the data (from the Flask app, or from a backup)

A backup is one SQLite file with the same tables in both apps, so it loads
straight into Turso:

1. Download a backup: "Download backup" at the bottom of any page.
2. Create a database from it: `turso db create tracker --from-file ~/Downloads/tracker-YYYY-MM-DD.sqlite`
   (a new name if `tracker` already exists).
3. Point Production at it: change `DATABASE_URL` and `DATABASE_AUTH_TOKEN` on Vercel, then redeploy.
4. Run `pnpm test:live`, then log in and look around.

## iPhone home screen

Open the live address in Safari, log in, then Share → Add to Home Screen. It
opens full screen on the map, with the name "50 States".
