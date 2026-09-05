import { readFileSync } from 'node:fs';
import { defineConfig } from 'wxt';

// WXT doesn't load .env into process.env before this config runs, so read it here.
function envFromFile(key: string): string | undefined {
  try {
    const line = readFileSync(new URL('.env', import.meta.url), 'utf8')
      .split('\n')
      .find((l) => l.trimStart().startsWith(`${key}=`));
    return line?.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
}

const PORTAL = (
  process.env.WXT_PORTAL_URL ??
  envFromFile('WXT_PORTAL_URL') ??
  'http://localhost:3000'
).replace(/\/$/, '');

// Hosts where the content script runs (the four ATS platforms).
const ATS_MATCHES = [
  '*://*.myworkdayjobs.com/*',
  '*://*.myworkdaysite.com/*',
  '*://boards.greenhouse.io/*',
  '*://job-boards.greenhouse.io/*',
  '*://*.greenhouse.io/*',
  '*://jobs.lever.co/*',
  '*://jobs.ashbyhq.com/*',
];

export default defineConfig({
  // Next.js dev (`npm run dev:web`) owns port 3000; keep WXT's dev server off it.
  dev: {
    server: { port: 3001 },
  },
  manifest: {
    name: 'Job Filler',
    description: 'Autofill Workday, Greenhouse, Lever and Ashby job applications from your saved profile.',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms'],
    host_permissions: [...ATS_MATCHES, `${PORTAL}/*`],
    action: { default_title: 'Job Filler' },
    browser_specific_settings: {
      gecko: { id: 'job-filler@example.com', strict_min_version: '121.0' },
    },
  },
  runner: {
    startUrls: [PORTAL],
  },
  vite: () => ({
    define: { __PORTAL_URL__: JSON.stringify(PORTAL) },
  }),
});
