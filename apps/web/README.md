# @job-filler/web

Next.js 15 (App Router) portal + API.

## Database — Neon

1. Create a project at [neon.tech](https://neon.tech) (region: `eu-west-2` for UK).
2. Create a database `job_filler` and a role with only `CONNECT`, `SELECT`,
   `INSERT`, `UPDATE`, `DELETE` on the app schema.
3. Copy **two** connection strings into `.env`:
   - `DATABASE_URL` → the **pooled** string (`...-pooler...`), `?sslmode=require`.
   - `DIRECT_URL` → the **direct** string (migrations).
4. `npm run db:migrate` (dev) / `npm run db:deploy` (prod).

## Auth model

- **Website**: Auth.js (NextAuth v5) Credentials provider, JWT session cookie
  (`HttpOnly`, `Secure`, `SameSite=Lax`). Config is split — `auth.config.ts` is
  edge-safe for middleware, `auth.ts` adds the argon2-backed provider.
- **Extension**: `POST /api/auth/token` (email+password) → `{ accessToken (JWT,
  15 min), refreshToken (opaque, 30 d, stored as SHA-256 hash) }`.
  `POST /api/auth/refresh` rotates (one-time-use). `POST /api/auth/logout` revokes.
- Sessions are listed and revocable at `/dashboard/security`.

## API

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/signup` | POST | — | create account, email verification |
| `/api/auth/verify-email` | GET | token | mark email verified |
| `/api/auth/token` | POST | credentials | extension login |
| `/api/auth/refresh` | POST | refresh token | rotate tokens |
| `/api/auth/logout` | POST | refresh token | revoke session |
| `/api/profile` | GET / PUT | Bearer or session | full profile bundle |
| `/api/profile/export` | GET | Bearer or session | download JSON |

CORS: only `NEXT_PUBLIC_APP_URL` + `ALLOWED_EXTENSION_ORIGINS` may send
credentialed cross-origin requests.

## Security measures

- **Passwords**: argon2id (`@node-rs/argon2`, OWASP params).
- **PII at rest**: AES-256-GCM (`src/lib/crypto.ts`) on `dateOfBirth`, `phone`,
  `addressLine1/2`, `nationality`, and every custom-answer value. Key in
  `ENCRYPTION_KEY`. Ciphertext is `base64(iv|tag|data)`.
- **Tokens**: refresh + verification tokens stored only as SHA-256 hashes.
- **Headers** (`next.config.mjs`): CSP, HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Rate limiting** (`src/lib/rate-limit.ts`): per-IP on signup / token; Upstash
  Redis in prod, in-memory in dev.
- **No user enumeration**: signup and login return generic responses.
- **Prisma** parameterised queries only; Zod validation on every input.

## Deploy to Vercel

1. Import the repo; set **Root Directory** to `apps/web`.
2. Build command `prisma generate && next build` (already in `package.json`),
   install command `npm install` at the repo root (Vercel detects the workspace).
3. Add all `.env` vars in the Vercel project (Production + Preview).
4. Add a **Deploy Hook** or CI step running `npm run db:deploy` against
   `DIRECT_URL` on each release.
5. After first deploy, note the extension IDs and set
   `ALLOWED_EXTENSION_ORIGINS`, then redeploy.
