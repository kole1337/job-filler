# @job-filler/web

Next.js 15 (App Router) portal + API. Runs locally — no accounts, no cloud
database.

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

## No accounts

There is no login. The portal trusts whatever is making the request, subject
only to the CORS check below — it's meant to run on your own machine for your
own use, not to be exposed to the internet.

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/profile` | GET / PUT | full profile bundle (used by the extension and the dashboard) |
| `/api/profile/export` | GET | download your profile as JSON |

### CORS

Only two kinds of origin may call these routes:
- the portal's own origin (same-origin requests from the dashboard), and
- `chrome-extension://…` / `moz-extension://…` — the browser extension. A
  normal website cannot claim this origin, so this is safe to allow
  unconditionally; no extension-ID configuration needed.

See `src/lib/cors.ts`.

## Security measures

- **No PII encryption at rest**: this is a local single-user SQLite file — if
  someone has access to that file, encrypting its columns with a key stored
  next to it wouldn't have protected you anyway. Keep the file as private as
  you'd keep any other personal document.
- **No rate limiting**: there's no login to brute-force and no public
  endpoint worth throttling in a local single-user tool.
- **Headers** (`next.config.mjs`): CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Prisma** parameterised queries only; Zod validation on every input.

## Running it

```bash
npm run dev        # http://localhost:3000, hot reload
npm run build      # prisma generate && next build
npm start          # serve the production build
```

There's no deployment step — this is meant to run on the same machine as the
browser extension that talks to it.
