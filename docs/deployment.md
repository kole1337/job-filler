# Configuration

Job Filler runs locally and ships with working defaults — there is nothing to
configure for normal use. This page covers the handful of optional overrides.

## `apps/web/.env`

Committed to the repo (it holds no secrets, just a local file path):

```
DATABASE_URL="file:../data/job-filler.db"
```

Change this if you want the SQLite database stored somewhere else (an
external drive, a synced folder, etc.) — any `file:` path Prisma accepts
works. There is no `DIRECT_URL`, no connection pooling, nothing else to set.

To move your existing data, just copy `apps/web/data/job-filler.db` to the new
location and update the path.

## `WXT_PORTAL_URL` — which portal the extension talks to

Default: `http://localhost:3000`. Only needed if you run the portal on a
different port. The portal only listens on, and only answers requests to,
`localhost` / `127.0.0.1`, so pointing it at another machine won't work. Either:

- set it inline: `WXT_PORTAL_URL=http://localhost:4000 npm run build:ext`, or
- put it in `packages/extension/.env`, or
- change it on the extension's own options page after installing it — this
  doesn't require a rebuild.

## Running the portal as a background service (optional)

For everyday use, `npm run dev:web` (or `npm run build:web && npm start` for
the production build) is enough — start it once, leave the terminal running
or close it when you're done. If you want it to start automatically with your
machine, run `npm run build:web && npm start` under your OS's usual tool for
that (a `systemd` user service on Linux, Task Scheduler on Windows, `launchd`
on macOS, or a process manager like `pm2`). None of this is required to use
the extension — it only needs the portal running while you're filling in
applications.

## Local use

The portal is intended for a machine and network you trust. It does not
guarantee that profile data is secure; you are responsible for protecting the
machine, network, browser extensions, and database location you use.
