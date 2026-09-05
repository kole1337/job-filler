# Job Filler

One profile, every application. A **web portal** where you enter your job-application
details once, and a **cross-browser extension** (Chrome + Firefox) that fills those
details into **Workday, Greenhouse, Lever and Ashby** application forms — always
showing you what it will enter before you submit.

## Monorepo layout

| Path | What |
| --- | --- |
| `apps/web` | Next.js 15 portal + API. Auth (email/password), profile CRUD, extension token endpoints. Deploys to Vercel. |
| `packages/shared` | Zod schemas + types for the profile and auth contracts. Single source of truth. |
| `packages/ats` | ATS detection, per-site playbooks, the label-based field resolver, and DOM extract/fill helpers. Framework-free, unit-tested. |
| `packages/extension` | WXT extension. Background (auth + sync), content script (scan + fill), popup, options. Builds Chrome MV3 and Firefox MV2 zips. |
| `docs/ats-flows.md` | Analysis of each ATS: steps, field rendering, known selectors. |

## Quick start

```bash
npm install
cp .env.example .env            # fill in DATABASE_URL etc. (see below)
npm run db:migrate              # create the schema on your Postgres
npm run dev:web                 # portal at http://localhost:3000
npm run dev:ext                 # loads the extension in a dev browser
```

Sign up at `/signup` (in dev the verification link is printed to the server
console), fill your profile at `/dashboard`, then log in with the same
credentials in the extension popup.

## Environment

Copy `.env.example` to `.env`. Required:

- `DATABASE_URL` / `DIRECT_URL` — Neon Postgres (pooled + direct). See
  `apps/web/README.md`.
- `AUTH_SECRET`, `EXT_JWT_SECRET`, `ENCRYPTION_KEY` — `openssl rand -base64 32` each.
- `NEXT_PUBLIC_APP_URL` — portal URL.
- `ALLOWED_EXTENSION_ORIGINS` — set once the extension IDs are known so the API
  only accepts cross-origin calls from your extension.

Optional: `RESEND_API_KEY` (real email; omitted = console), `UPSTASH_REDIS_*`
(distributed rate limiting; omitted = in-memory).

## Scripts

`npm run` … `dev:web`, `dev:ext`, `build:web`, `build:ext`, `db:migrate`,
`db:studio`, `lint`, `typecheck`, `test`.

## How the fill works (hybrid)

1. The content script detects the ATS from the URL / DOM.
2. It extracts every form control into a serialisable descriptor (label,
   aria-label, name, id, placeholder, nearby heading, options).
3. The **playbook** for that ATS maps known-stable selectors to profile keys.
4. The **resolver** independently scores each field by its visible text against a
   keyword ruleset.
5. Playbook + resolver agree → auto-fill. They disagree, or confidence is low →
   the field goes to the popup's "Check first" list and is outlined on the page.
   Unmapped required fields are listed so you can add them to your profile.
6. Nothing is submitted. Ever. You review and click submit yourself.

## Security

See `apps/web/README.md`. Summary: argon2id passwords, AES-256-GCM column
encryption for sensitive PII (DoB, phone, address, nationality, custom answers),
short-lived JWT access tokens + rotating opaque refresh tokens for the extension,
strict CORS allowlist, security headers, per-IP rate limiting, no user
enumeration.

## Status

End-to-end skeleton. ATS playbook selectors are from documented structures and
marked `// VERIFY LIVE` — run the live verification pass (open one public posting
per ATS, confirm/patch selectors) before relying on it. `npm audit` currently
flags issues in build-time tooling (WXT's `adm-zip`/`tar`/`esbuild`, Next's
bundled `postcss`); none are in the portal's runtime path.
