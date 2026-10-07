# Job Filler

One profile, every application. A **local web portal** where you enter your
job-application details once, and a **cross-browser extension** (Chrome +
Firefox) that fills those details into **Workday, Greenhouse, Lever and
Ashby** application forms — always showing you what it will enter before you
submit.

Runs entirely on your own machine. No account, no cloud database, no external
services — your profile lives in one local SQLite file.

## Monorepo layout

| Path | What |
| --- | --- |
| `apps/web` | Next.js 15 portal + API. Profile CRUD, runs locally with `npm run dev:web`. |
| `packages/shared` | Zod schemas + types for the profile. Single source of truth. |
| `packages/ats` | ATS detection, per-site playbooks, the label-based field resolver, and DOM extract/fill helpers. Framework-free, unit-tested. |
| `packages/extension` | WXT extension. Background (sync), content script (scan + fill), popup, options. Builds Chrome MV3 and Firefox MV2 zips. |
| `docs/ats-flows.md` | Analysis of each ATS: steps, field rendering, known selectors. |

## Project map

How the pieces talk to each other:

```
 Browser (you)                      Portal (apps/web, Next.js on localhost)      SQLite file
 ─────────────                      ────────────────────────────────────         ───────────
 /dashboard  ───────────────────▶ pages + server actions ──▶ lib/profile-repo ──▶ Prisma models

 Extension popup ─▶ background ──▶ GET/PUT http://localhost:3000/api/profile
                        │  (cached profile in browser.storage)
                        ▼
                  content script on the ATS page
                        │ uses packages/ats: detect → extract → resolve → fill
                        ▼
                  the Workday / Greenhouse / Lever / Ashby form
```

`packages/shared` is imported by all three of the others, so the profile shape is
defined in exactly one place. There is no login — the portal and the extension
both trust whatever is running on your machine.

### Root

| File | What it does |
| --- | --- |
| `package.json` | npm workspaces root. All `npm run …` scripts live here and forward to a workspace. |
| `tsconfig.base.json` | Shared TypeScript settings every package extends. |
| `.prettierrc.json`, `.gitattributes`, `.gitignore` | Formatting / git housekeeping. |
| `.github/workflows/ci.yml` | CI: install → prisma generate → typecheck → test → build extension → build web. |
| `.github/dependabot.yml` | Dependency update bot config. |
| `docs/ats-flows.md` | Research notes per ATS: page steps, how fields render, live-verified selectors. |
| `docs/deployment.md` | The (very short) list of things you can configure. |

### `packages/shared` — the data contract

| File | What it does |
| --- | --- |
| `src/profile.ts` | **The profile schema** (Zod): personal, education, experience, custom answers, enums (qualification types, UK honours, employment types), `emptyProfile`, `profileCompleteness`, suggested custom answers. |
| `src/index.ts` | Re-exports, plus `ProfileFieldKey` (the list of fillable profile keys). |
| `src/profile.test.ts` | Unit tests for the schema. |

### `apps/web` — portal + API

| Path | What it does |
| --- | --- |
| `prisma/schema.prisma` | Database tables: `Profile` (singleton row), `Education`, `Experience`, `CustomAnswer`. SQLite, one local file. |
| `prisma/migrations/` | Generated SQL migrations (create new ones with `npm run db:migrate`). |
| `src/app/page.tsx` | Home page — renders `components/landing/Landing.tsx`. |
| `src/app/layout.tsx`, `globals.css` | Root HTML shell, page title/metadata, shared Tailwind classes (`.input`, `.btn`, `.card`, …). |
| `src/app/dashboard/layout.tsx` | Dashboard header/nav. No login, so no redirect/guard here. |
| `src/app/dashboard/page.tsx` | Profile page: completeness bar + `ProfileEditor` + onboarding tour + "clear local data". |
| `src/app/dashboard/actions.ts` | Server actions used by the dashboard: save profile, clear all local data. |
| `src/app/api/profile/route.ts` | `GET` / `PUT` the profile (used by the extension — no auth, just CORS). |
| `src/app/api/profile/export/route.ts` | Download your profile as JSON. |
| `src/components/ProfileEditor.tsx` | The big profile form (tabs: personal, education, experience, extra). |
| `src/components/ClearDataButton.tsx` | Confirms, then wipes the local profile via `clearProfileAction`. |
| `src/components/OnboardingTour.tsx` | First-visit guided tour on the dashboard (steps target `data-tour="…"` elements). |
| `src/components/landing/Landing.tsx` | Landing page content (plain HTML-style markup, no client JS). |
| `src/components/landing/landing.css` | Landing page styles, all scoped under `.landing` (light/dark via `prefers-color-scheme`). |
| `src/lib/profile-repo.ts` | **Read/write the profile to the local DB** — no encryption, no per-user scoping (there's one profile). |
| `src/lib/cors.ts` | Only `chrome-extension://`/`moz-extension://` origins and the portal's own origin may call the API — no config needed. |
| `src/lib/db.ts` | Prisma client singleton. |
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
| `entrypoints/background.ts` | Handles `SYNC_PROFILE` / `GET_PROFILE` messages. |
| `entrypoints/content.ts` | Runs on ATS pages. Handles `PLAN_FILL`, `APPLY_FILL`, `DETECT` using `packages/ats`. |
| `entrypoints/popup/main.ts` + `index.html` + `style.css` | The popup UI (vanilla TS): sync, plan, review list, fill. No login screen — it just talks to whatever portal is configured. |
| `entrypoints/options/main.ts` + `index.html` | Settings page: portal URL, confidence threshold, "always review", clear cached profile. |
| `entrypoints/popup/App.tsx`, `main.tsx`, `options/main.tsx` | Empty leftovers from an earlier React version — safe to delete. |
| `src/lib/api.ts` | `fetchProfile()` — plain `GET {portalUrl}/api/profile`, no auth. |
| `src/lib/storage.ts` | `browser.storage` wrapper: settings (+ defaults), cached profile. |
| `src/lib/messages.ts` | Message types shared by popup, background and content script. |

## Where to change things

| I want to… | Go to |
| --- | --- |
| **Add a new profile field** | 1. `packages/shared/src/profile.ts` (schema) and `src/index.ts` (`ProfileFieldKey`) → 2. `apps/web/prisma/schema.prisma` + `npm run db:migrate` → 3. `apps/web/src/lib/profile-repo.ts` (load/save) → 4. `apps/web/src/components/ProfileEditor.tsx` (form input) → 5. `packages/ats/src/flatten.ts` (so it's fillable) → 6. `packages/ats/src/keywords.ts` and/or an adapter (so it gets matched). |
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
| Add an API endpoint | New `apps/web/src/app/api/<name>/route.ts`; copy `api/profile/route.ts` for CORS. |
| Change the database | `apps/web/prisma/schema.prisma`, then `npm run db:migrate`. |
| Change CI | `.github/workflows/ci.yml`. |

## Quick start

```bash
npm install
npm run db:migrate              # creates apps/web/data/job-filler.db
npm run dev:web                 # portal at http://localhost:3000
npm run dev:ext                 # loads the extension in a dev browser
```

That's it — no accounts, no `.env` to edit. Fill your profile at
`/dashboard`, then open the extension popup on a Workday/Greenhouse/Lever/Ashby
application; it reads the profile straight from the portal running on your
machine.

## Environment

Nothing to configure for local use. `apps/web/.env` is committed with
`DATABASE_URL="file:./data/job-filler.db"` — change it there (or set
`DATABASE_URL` in your shell) if you want the database stored elsewhere.
`WXT_PORTAL_URL` (default `http://localhost:3000`) only matters if you run the
portal on a different port — see `docs/deployment.md`.

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

This is a local, single-user tool — there's no account system and nothing is
sent off your machine. The trust model is simply "whatever is running on your
localhost is you". The one thing still worth guarding against is a random
webpage in the same browser silently reading your profile from
`http://localhost:3000`, so the API's CORS policy only allows requests from
the browser extension's own origin (`chrome-extension://…` /
`moz-extension://…`, which a normal website cannot spoof) or the portal's own
origin — see `apps/web/src/lib/cors.ts`. See `apps/web/README.md` for more.

## Status

End-to-end skeleton. ATS playbook selectors are from documented structures and
marked `// VERIFY LIVE` — run the live verification pass (open one public posting
per ATS, confirm/patch selectors) before relying on it. `npm audit` currently
flags issues in build-time tooling (WXT's `adm-zip`/`tar`/`esbuild`, Next's
bundled `postcss`); none are in the portal's runtime path.
