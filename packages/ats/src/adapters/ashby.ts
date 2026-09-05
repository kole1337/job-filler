import type { Adapter, FieldDescriptor, TargetKey } from '../types';
import { normalize } from '../normalize';

/**
 * Ashby (jobs.ashbyhq.com) — React SPA backed by GraphQL.
 * Built-in fields expose `name` = _systemfield_name | _systemfield_email |
 * _systemfield_phone | _systemfield_resume, plus a LinkedIn / website field.
 * Everything else is a custom field addressed by its <label> text — resolver-only.
 *
 * VERIFY LIVE: confirm the `_systemfield_*` names and how the location field is
 * structured (single combobox vs. split address) on a current posting.
 */
const NAME_MAP: Record<string, TargetKey> = {
  _systemfield_name: 'personal.fullName',
  _systemfield_email: 'personal.email',
  _systemfield_phone: 'personal.phone',
};

export const ashbyAdapter: Adapter = {
  id: 'ashby',
  matches: (ctx) =>
    ctx.hostname.endsWith('ashbyhq.com') ||
    ctx.document?.querySelector('[class*="ashby-application-form"], form[data-testid*="application"]') != null,
  getStepPlan: () => ({
    singlePage: true,
    steps: ['Resume/CV upload', 'Basic information', 'Links', 'Role-specific questions', 'Submit'],
    notes: [
      'Single page; uploading a CV pre-fills name/email/phone which you can correct.',
      'Location is a single autocomplete — type a city and pick.',
      'Custom questions are matched by their visible label only.',
    ],
  }),
  resolveField: (d: FieldDescriptor) => {
    const name = (d.name ?? '').toLowerCase();
    if (NAME_MAP[name]) return { target: NAME_MAP[name]!, confidence: 0.93, reason: `Ashby ${name}` };
    const label = normalize(d.label ?? d.ariaLabel ?? '');
    if (/linkedin/.test(label)) return { target: 'personal.linkedinUrl', confidence: 0.9, reason: 'Ashby LinkedIn' };
    if (/github/.test(label)) return { target: 'personal.githubUrl', confidence: 0.9, reason: 'Ashby GitHub' };
    if (/(^|\s)(website|portfolio)(\s|$)/.test(label)) return { target: 'personal.portfolioUrl', confidence: 0.7, reason: 'Ashby website' };
    if (/location/.test(label)) return { target: 'personal.city', confidence: 0.55, reason: 'Ashby location' };
    return null;
  },
  quirks: [
    'The resume dropzone is a real file input — the extension cannot attach files; upload manually.',
    'Some tenants embed the Ashby form in their own site via an iframe on jobs.ashbyhq.com.',
  ],
};
