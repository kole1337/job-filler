# @job-filler/extension

Cross-browser extension built with [WXT](https://wxt.dev).

## Develop

```bash
npm run dev            # Chrome (MV3), auto-reload
npm run dev:firefox    # Firefox (MV2)
```

`WXT_PORTAL_URL` (env, default `http://localhost:3000`) sets which portal the
extension talks to and is baked in as the default; users can override it on the
options page.

## Build / package

```bash
npm run build          # .output/chrome-mv3 and .output/firefox-mv2
npm run zip            # distributable zips for the stores
```

## Load unpacked

- **Chrome**: `chrome://extensions` → Developer mode → Load unpacked →
  `.output/chrome-mv3`.
- **Firefox**: `about:debugging` → This Firefox → Load Temporary Add-on →
  `.output/firefox-mv2/manifest.json`. (Or `npx web-ext run` from that folder.)

## Architecture

- `entrypoints/background.ts` — message broker: `SYNC_PROFILE` / `GET_PROFILE`.
  Fetches the profile from the local portal with a plain `GET` (no auth — the
  portal has no login) and caches it in `chrome.storage.local`; refreshes on
  an alarm.
- `entrypoints/content.ts` — runs on the four ATS hosts. Handles `PLAN_FILL`
  (detect + extract + resolve, outline review fields) and `APPLY_FILL` (fill the
  selected refs, never submit).
- `entrypoints/popup` — sync status, "Scan this page", the review list.
- `entrypoints/options` — portal URL, confidence threshold, clear cached profile.
- All ATS logic lives in `@job-filler/ats`; this package is just wiring + UI.

## Notes

- The extension never fills passwords, CAPTCHAs, consent/GDPR/EEO checkboxes, or
  file inputs, and never clicks Next/Submit.
- Firefox ships as MV2 (WXT default, best AMO compatibility). Switch to MV3 by
  setting `manifestVersion: 3` in `wxt.config.ts` if you need it.
