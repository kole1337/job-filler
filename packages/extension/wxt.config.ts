import { defineConfig } from 'wxt';

const PORTAL = process.env.WXT_PORTAL_URL ?? 'http://localhost:3000';

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
