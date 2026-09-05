# Environment variables & deployment

## Where the files go

| File | Read by | Committed? |
| --- | --- | --- |
| `apps/web/.env` | `next dev`, `next build`, and every `prisma` command (all run with `apps/web` as the working directory) | **No** — git-ignored. This is the one you edit for local dev. |
| `apps/web/.env.local` | same as above, takes precedence over `.env` | No. Optional; use it for machine-specific overrides. |
| `packages/extension/.env` | `wxt` build/dev — only needs `WXT_PORTAL_URL` | No. Optional; you can also pass it inline. |
| Vercel → Project → Settings → Environment Variables | the deployed app | n/a — set in the Vercel dashboard, not a file |
| repo root `.env.example` | nothing — it's the template | Yes |

There is **no** root `.env` in normal use. If one exists from an earlier build
test, delete it to avoid confusion — `apps/web/.env` is authoritative.

Start local dev by copying the template:

```bash
cp .env.example apps/web/.env      # then edit apps/web/.env
```

---

## Each variable

### `DATABASE_URL` and `DIRECT_URL` — Postgres (Neon)

1. Sign up at <https://neon.tech> (GitHub login is fine). Free tier is enough.
2. **Create project** → name it `job-filler`, region **AWS eu-west-2 (London)**
   for UK latency. Postgres 16.
3. It creates a database (default name `neondb`) and a role. On the project
   **Dashboard** you'll see a **Connection string** panel.
4. You need two forms of the string:
   - **Pooled** (has `-pooler` in the host) → `DATABASE_URL`. Toggle "Connection
     pooling" ON in the panel to get it.
   - **Direct** (no `-pooler`) → `DIRECT_URL`. Toggle pooling OFF, or use the
     "Direct connection" option.
   Both must end with `?sslmode=require`.
5. Paste into `apps/web/.env`:
   ```
   DATABASE_URL="postgresql://job-filler_owner:npg_xxx@ep-cool-name-123456-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://job-filler_owner:npg_xxx@ep-cool-name-123456.eu-west-2.aws.neon.tech/neondb?sslmode=require"
   ```
6. Create the tables:
   ```bash
   npm run db:migrate        # dev: creates + applies the first migration
   ```
   For production later: `npm run db:deploy` (runs against `DIRECT_URL`).

**Hardening (do this before real users):** in the Neon console → **Roles**,
create a second role `job_filler_app` and grant it only
`SELECT, INSERT, UPDATE, DELETE` on schema `public` (not `CREATE`/`DROP`). Use
that role's connection string for `DATABASE_URL` in production; keep the owner
role only for `DIRECT_URL` (migrations). Neon enforces TLS already; also enable
**IP Allow** and add Vercel's egress ranges if you want to lock it down.

### `AUTH_SECRET` — Auth.js session signing

Random 32-byte secret. Generate:
```bash
openssl rand -base64 32
```
(no OpenSSL on Windows? `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

### `EXT_JWT_SECRET` — signs the extension's short-lived access tokens

A **different** random value, same way as `AUTH_SECRET`. Keeping it separate means
a leak of one doesn't compromise the other.

### `ENCRYPTION_KEY` — AES-256-GCM key for encrypting PII columns

Must decode to **exactly 32 bytes**. Generate:
```bash
openssl rand -base64 32
```
Encrypts `dateOfBirth`, `phone`, address lines, `nationality`, and every custom
answer value at rest. **If you lose or change this value, existing encrypted rows
become unreadable** — treat it like a password. Store the production value only in
Vercel (and your own password manager), never in git.

### `NEXT_PUBLIC_APP_URL` — public URL of the portal

- Local: `http://localhost:3000`
- Production: `https://your-project.vercel.app` (or your custom domain)

Baked into client bundles and used to build email links and the CORS allowlist.

### `AUTH_URL` — optional

Only needed if Auth.js can't infer the deployment URL. On Vercel it's inferred;
locally set `http://localhost:3000`.

### `ALLOWED_EXTENSION_ORIGINS` — CORS allowlist for the extension

Comma-separated list of the extension origins allowed to call the API with
credentials. You only know these **after** you build/load the extension:

- **Chrome**: load `.output/chrome-mv3` at `chrome://extensions`; the card shows
  an **ID** like `abcdefghijklmnopabcdefghijklmnop`. Origin =
  `chrome-extension://abcdefghijklmnopabcdefghijklmnop`.
  (For a stable ID across machines, publish to the Web Store, or add a `key` to
  the manifest.)
- **Firefox**: origin is `moz-extension://<UUID>` where the UUID is generated per
  install. For a shared build, publish to AMO (even unlisted) and use the
  assigned ID, or accept that each dev install differs.

Example:
```
ALLOWED_EXTENSION_ORIGINS="chrome-extension://abcdefghijklmnopabcdefghijklmnop,moz-extension://11111111-2222-3333-4444-555555555555"
```
Until it's set, the extension can still work if you also serve it from the same
origin — but for production, set it so cross-origin API calls are locked down.

### `RESEND_API_KEY` and `EMAIL_FROM` — transactional email (optional)

- **Leave `RESEND_API_KEY` empty in dev** — verification / reset links are printed
  to the terminal running `npm run dev:web`.
- For production: sign up at <https://resend.com>, verify a sending domain (add
  the DNS records they give you), create an API key (`re_...`), set
  `EMAIL_FROM="Job Filler <noreply@yourdomain.com>"`.

### `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — rate limiting (optional)

- **Leave empty in dev** — an in-memory limiter is used.
- For production on Vercel (multiple serverless instances), the in-memory limiter
  is per-instance and weak. Create a free database at <https://upstash.com> →
  Redis → copy the **REST URL** and **REST token** from the database page.

### `WXT_PORTAL_URL` — which portal the extension talks to (extension build only)

Put in `packages/extension/.env`, or pass inline:
```
WXT_PORTAL_URL=https://your-project.vercel.app npm run build:ext
```
Default is `http://localhost:3000`. Users can also override it on the extension's
options page, but this sets the shipped default and the `host_permissions` entry.

---

## Deploying the portal to Vercel

1. Push the repo to GitHub. In Vercel: **New Project** → import the repo.
2. **Root Directory**: `apps/web`. Framework preset: Next.js (auto-detected).
3. Build command is already `prisma generate && next build` (from
   `apps/web/package.json`). Install command: leave default — Vercel installs the
   whole workspace from the repo root.
4. **Environment Variables**: add every var from the list above for both
   **Production** and **Preview**. `NEXT_PUBLIC_APP_URL` differs per environment.
5. Deploy. First deploy will fail to connect to the DB only if migrations haven't
   run — run them once:
   ```bash
   DIRECT_URL="<your neon direct url>" npx prisma migrate deploy --schema apps/web/prisma/schema.prisma
   ```
   or add a Vercel "Build Command" prefix of `prisma migrate deploy &&` once
   you're comfortable auto-migrating on deploy.
6. After the first successful deploy: build the extension with
   `WXT_PORTAL_URL=<vercel url>`, load it, copy the extension IDs into
   `ALLOWED_EXTENSION_ORIGINS`, redeploy.
7. Smoke test: sign up on the deployed URL, verify via the Resend email, fill the
   dashboard, then log in from the extension popup and run "Scan this page" on a
   real posting.

## Generating all secrets at once

```bash
node -e "for (const k of ['AUTH_SECRET','EXT_JWT_SECRET','ENCRYPTION_KEY']) console.log(k+'=\"'+require('crypto').randomBytes(32).toString('base64')+'\"')"
```
