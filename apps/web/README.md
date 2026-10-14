# @job-filler/web

Next.js 15 (App Router) portal + API intended for local use.

## Database — SQLite

The whole database is one local file, `apps/web/data/job-filler.db`. There's
nothing to sign up for and nothing to configure:

```bash
npm run db:migrate     # creates/updates apps/web/data/job-filler.db
npm run db:studio      # browse it in Prisma Studio
```

`DATABASE_URL` lives in the committed `apps/web/.env`
(`file:../data/job-filler.db`) — it's not a secret, just a path, so it's
checked into git. Change it there if you want the file stored somewhere else
(e.g. a synced folder).

**Backup / move your data**: copy `apps/web/data/job-filler.db`. That's the
entire database.

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/profile` | GET / PUT | full profile bundle (used by the extension and the dashboard) |
| `/api/profile/export` | GET | download your profile as JSON |

## Local-use notice

The portal is intended to be used only on a machine and network you trust. It
does not guarantee that profile data is secure. If another process or device
can reach the portal, it may be able to read or replace profile data. You are
responsible for protecting the machine, network, browser extensions, and local
database used with this project.

## Running it

```bash
npm run dev        # http://localhost:3000, hot reload
npm run build      # prisma generate && next build
npm start          # serve the production build
```

There's no deployment step — this is meant to run on the same machine as the
browser extension that talks to it.
