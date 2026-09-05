import type { Adapter } from '../types';

/** Fallback adapter — no playbook, resolver-only. Always matches last. */
export const genericAdapter: Adapter = {
  id: 'generic',
  matches: () => true,
  getStepPlan: () => ({
    singlePage: true,
    steps: ['Application form'],
    notes: [
      'Unrecognised application host — filling from field labels only.',
      'Review every field before submitting.',
    ],
  }),
  resolveField: () => null,
  quirks: ['No site-specific playbook; matches rely entirely on visible labels.'],
};
