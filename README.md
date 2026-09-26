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

## Project map

How the pieces talk to each other:

```
 Browser (you)                      Portal (apps/web, Next.js on Vercel)          Postgres (Neon)
 ─────────────                      ────────────────────────────────────          ───────────────
 /signup /login /dashboard  ──────▶ pages + server actions ──▶ lib/profile-repo ──▶ Prisma models
                                                                (encrypts PII)
 Extension popup ─▶ background ──▶ /api/auth/token, /api/auth/refresh, /api/profile
                        │  (tokens + cached profile in browser.storage)
                        ▼
                  content script on the ATS page
                        │ uses packages/ats: detect → extract → resolve → fill
                        ▼
                  the Workday / Greenhouse / Lever / Ashby form
```

`packages/shared` is imported by all three of the others, so the profile shape is
defined in exactly one place.

### Root

| File | What it does |
| --- | --- |
| `package.json` | npm workspaces root. All `npm run …` scripts live here and forward to a workspace. |
| `tsconfig.base.json` | Shared TypeScript settings every package extends. |
| `.env.example` | Template for `.env` (portal secrets + `WXT_PORTAL_URL` for the extension). |
| `.prettierrc.json`, `.gitattributes`, `.gitignore` | Formatting / git housekeeping. |
| `.github/workflows/ci.yml` | CI: install → prisma generate → typecheck → test → build extension → build web. |
| `.github/dependabot.yml` | Dependency update bot config. |
| `docs/ats-flows.md` | Research notes per ATS: page steps, how fields render, live-verified selectors. |
| `docs/deployment.md` | Every environment variable explained + how to deploy to Vercel. |

### `packages/shared` — the data contract

| File | What it does |
| --- | --- |
| `src/profile.ts` | **The profile schema** (Zod): personal, education, experience, custom answers, enums (qualification types, UK honours, employment types), `emptyProfile`, `profileCompleteness`, suggested custom answers. |
| `src/auth.ts` | Schemas for credentials, signup password rules, token responses, refresh requests, JWT claims. |
| `src/index.ts` | Re-exports, plus `ProfileFieldKey` (the list of fillable profile keys). |
| `src/profile.test.ts` | Unit tests for the schema. |

### `apps/web` — portal + API

| Path | What it does |
| --- | --- |
| `prisma/schema.prisma` | Database tables: `User`, `Profile`, `Education`, `Experience`, `CustomAnswer`, `Session` (extension refresh tokens), `VerificationToken`. Columns ending in `Enc` hold encrypted PII. |
| `prisma/migrations/` | Generated SQL migrations (create new ones with `npm run db:migrate`). |
| `src/app/page.tsx` | Home page — renders `components/landing/Landing.tsx`. |
| `src/app/layout.tsx`, `globals.css` | Root HTML shell, page title/metadata, shared Tailwind classes (`.input`, `.btn`, `.card`, …). |
| `src/app/signup/page.tsx` | Signup form (client side, posts to `/api/auth/signup`). |
| `src/app/login/page.tsx` | Login form (server action via Auth.js). |
| `src/app/dashboard/layout.tsx` | Dashboard header/nav; redirects to `/login` if signed out. |
| `src/app/dashboard/page.tsx` | Profile page: completeness bar + `ProfileEditor` + onboarding tour. |
| `src/app/dashboard/security/page.tsx` | List/revoke extension sessions, delete account. |
| `src/app/dashboard/actions.ts` | Server actions used by the dashboard: save profile, list/revoke sessions, delete account. |
| `src/app/api/auth/signup/route.ts` | Create account + send verification email (rate limited). |
| `src/app/api/auth/verify-email/route.ts` | Email-verification link target. |
| `src/app/api/auth/token/route.ts` | **Extension login**: email/password → access + refresh token. |
| `src/app/api/auth/refresh/route.ts` | Extension token refresh (rotates the refresh token). |
| `src/app/api/auth/logout/route.ts` | Revoke an extension refresh token. |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js handlers for the website login session. |
| `src/app/api/profile/route.ts` | `GET` / `PUT` the profile (used by the extension). |
| `src/app/api/profile/export/route.ts` | Download your profile as JSON. |
| `src/components/ProfileEditor.tsx` | The big profile form (tabs: personal, education, experience, extra). |
| `src/components/OnboardingTour.tsx` | First-visit guided tour on the dashboard (steps target `data-tour="…"` elements). |
| `src/components/landing/Landing.tsx` | Landing page content (plain HTML-style markup, no client JS). |
| `src/components/landing/landing.css` | Landing page styles, all scoped under `.landing` (light/dark via `prefers-color-scheme`). |
| `src/auth.config.ts` | Edge-safe Auth.js config (session length, which routes need login). |
| `src/auth.ts` | Full Auth.js setup with the email/password Credentials provider. |
| `src/middleware.ts` | Protects `/dashboard/*`. |
| `src/lib/profile-repo.ts` | **Read/write the profile to the DB**, encrypting/decrypting sensitive fields. |
| `src/lib/ext-token.ts` | Issue/verify extension JWTs; issue/rotate/revoke refresh tokens. |
| `src/lib/api-auth.ts` | `getApiUser()` — accepts either a Bearer token (extension) or a website session. |
| `src/lib/cors.ts` | CORS allowlist (portal + extension origins). |
| `src/lib/crypto.ts` | AES-256-GCM encrypt/decrypt, hashing, random tokens. |
| `src/lib/password.ts` | argon2id hash/verify. |
| `src/lib/verification.ts` | Email-verify / password-reset tokens. |
| `src/lib/mail.ts` | Send email via Resend (or print to console in dev) + email templates. |
| `src/lib/rate-limit.ts` | Rate limiter (Upstash Redis, or in-memory fallback). |
| `src/lib/env.ts` | Validated environment variables. |
| `src/lib/db.ts` | Prisma client singleton. |
| `src/types/next-auth.d.ts` | Adds `user.id` to the Auth.js session type. |
| `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs` | Next.js config (security headers etc.), Tailwind theme (`brand` colour), PostCSS. |

### `packages/ats` — the filling brain (no browser-extension code)

| File | What it does |
| --- | --- |
| `src/index.ts` | Public exports + `planFill()`, the one-call pipeline: detect → extract → flatten → resolve. |
| `src/types.ts` | Core types: `FieldDescriptor`, `ControlKind`, `TargetKey`, `FieldMatch`, `Adapter` interface. |
| `src/detect.ts` | `ADAPTERS` list (order matters) and `detectAdapter()` — which ATS is this page? |
| `src/adapters/workday.ts` | Workday playbook: `data-automation-id` → profile key, step plan, quirks. |
| `src/adapters/greenhouse.ts` | Greenhouse playbook (classic + new React board). |
| `src/adapters/lever.ts` | Lever playbook (`name` attributes). |
| `src/adapters/ashby.ts` | Ashby playbook (`_systemfield_*` names). |
| `src/adapters/generic.ts` | Fallback for unknown sites — labels only. |
| `src/dom-extract.ts` | Walks the page and turns each form control into a `FieldDescriptor` (label, name, options…). |
| `src/keywords.ts` | `KEYWORD_RULES` — label phrases → profile key (positives, negatives, weights). |
| `src/resolver.ts` | Scores each field with the playbook + keyword rules, splits into auto-fill / review / unmatched. Default auto-fill threshold `0.7`. |
| `src/flatten.ts` | Turns a `Profile` into flat `"education.0.institution" → "value"` lookups; grade shortening. |
| `src/options.ts` | Picks the right dropdown option (yes/no synonyms, degree and grade synonyms). |
| `src/normalize.ts` | Text normalisation used for matching. |
| `src/dom-fill.ts` | Actually writes values into inputs/selects/comboboxes in a React/Vue-safe way; date formatting; review outlines. |
| `src/resolver.test.ts` | Unit tests for resolving. |

### `packages/extension` — the browser extension (WXT)

| File | What it does |
| --- | --- |
| `wxt.config.ts` | Manifest (name, permissions, host permissions, Firefox ID), portal URL, dev server. |
| `entrypoints/background.ts` | Handles `AUTH_STATUS` / `LOGIN` / `LOGOUT` / `SYNC_PROFILE` messages. |
| `entrypoints/content.ts` | Runs on ATS pages. Handles `PLAN_FILL`, `APPLY_FILL`, `DETECT` using `packages/ats`. |
| `entrypoints/popup/main.ts` + `index.html` + `style.css` | The popup UI (vanilla TS): login, sync, plan, review list, fill. |
| `entrypoints/options/main.ts` + `index.html` | Settings page: portal URL, confidence threshold, "always review", clear data. |
| `entrypoints/popup/App.tsx`, `main.tsx`, `options/main.tsx` | Empty leftovers from an earlier React version — safe to delete. |
| `src/lib/api.ts` | Calls the portal: login, token refresh, logout, fetch profile. |
| `src/lib/storage.ts` | `browser.storage` wrapper: tokens, settings (+ defaults), cached profile. |
| `src/lib/messages.ts` | Message types shared by popup, background and content script. |

## Where to change things

| I want to… | Go to |
| --- | --- |
| **Add a new profile field** | 1. `packages/shared/src/profile.ts` (schema) and `src/index.ts` (`ProfileFieldKey`) → 2. `apps/web/prisma/schema.prisma` + `npm run db:migrate` → 3. `apps/web/src/lib/profile-repo.ts` (load/save; use `encrypt` if it's sensitive) → 4. `apps/web/src/components/ProfileEditor.tsx` (form input) → 5. `packages/ats/src/flatten.ts` (so it's fillable) → 6. `packages/ats/src/keywords.ts` and/or an adapter (so it gets matched). |
| Fix a field that fills wrongly on one ATS | `packages/ats/src/adapters/<ats>.ts`. Check `docs/ats-flows.md` for the known selectors. |
| Fix a field that's matched wrongly everywhere | `packages/ats/src/keywords.ts` (add a positive/negative phrase), then add a case to `resolver.test.ts`. |
| Fix a dropdown picking the wrong option | `packages/ats/src/options.ts`. |
| Fix a value that won't "stick" in an input / combobox | `packages/ats/src/dom-fill.ts`. |
| Fix a label not being picked up | `packages/ats/src/dom-extract.ts`. |
| Support a new ATS | New file in `packages/ats/src/adapters/`, add it to `ADAPTERS` in `detect.ts` (before `generic`), export it from `index.ts`, and add its URL pattern in **both** `packages/extension/wxt.config.ts` (`ATS_MATCHES`) and `entrypoints/content.ts` (`matches`). |
| Change auto-fill confidence | Default: `DEFAULT_MIN_CONFIDENCE` in `packages/ats/src/resolver.ts`. Per-user default: `packages/extension/src/lib/storage.ts` settings. |
| Change the extension popup UI | `packages/extension/entrypoints/popup/main.ts` and `style.css`. |
| Change the extension settings page | `packages/extension/entrypoints/options/main.ts`. |
| Change extension name / permissions | `packages/extension/wxt.config.ts` (`manifest`). |
| Change the landing page | Text/layout: `apps/web/src/components/landing/Landing.tsx`. Colours/spacing: `landing.css` next to it (colour variables at the top). |
| Change the dashboard / profile form | `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/components/ProfileEditor.tsx`. |
| Change the onboarding tour | `apps/web/src/components/OnboardingTour.tsx` (`STEPS`). |
| Change colours / shared button & input styles | `apps/web/tailwind.config.ts` (`brand`), `apps/web/src/app/globals.css`. |
| Change the login / signup pages | `apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`. |
| Change password rules | `signupSchema` in `packages/shared/src/auth.ts`. |
| Change token lifetimes | `apps/web/src/lib/ext-token.ts` (extension), `apps/web/src/auth.config.ts` (website session). |
| Change rate limits | The `rateLimit(...)` calls in each `apps/web/src/app/api/**/route.ts`. |
| Change email wording | `apps/web/src/lib/mail.ts`. |
| Add an API endpoint | New `apps/web/src/app/api/<name>/route.ts`; copy `api/profile/route.ts` for auth + CORS. |
| Add an environment variable | `.env.example`, `apps/web/src/lib/env.ts`, `docs/deployment.md`. |
| Change the database | `apps/web/prisma/schema.prisma`, then `npm run db:migrate`. |
| Change CI | `.github/workflows/ci.yml`. |

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
