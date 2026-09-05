import type { Adapter, FieldDescriptor, TargetKey } from '../types';
import { normalize } from '../normalize';

/**
 * Lever (jobs.lever.co) — single-page, plain HTML form.
 * Known stable `name` attributes on the built-in personal fields.
 *   name="name"  email  phone  org  location  resume
 *   urls[LinkedIn] urls[GitHub] urls[Twitter] urls[Portfolio] urls[Other]
 * Custom questions render as cards: name="cards[<uuid>][field0]" etc. — resolver-only.
 *
 * VERIFY LIVE: confirm the `urls[...]` bracket casing and the `org`/`location` names
 * on a current posting; Lever has iterated the board markup.
 */
// Confirmed live (jobs.lever.co, 2026): name, email, phone, org, location
// (id="location-input"), resume (file, id="resume-upload-input"),
// opportunityLocationId (<select> "which location are you applying for"),
// and capitalised url keys urls[LinkedIn] / urls[GitHub] / urls[Portfolio] /
// urls[Twitter] / urls[Other]. Labels live in a sibling .application-label.
const NAME_MAP: Record<string, TargetKey> = {
  name: 'personal.fullName',
  email: 'personal.email',
  phone: 'personal.phone',
  org: 'experience.0.employer',
  location: 'personal.city',
  'urls[linkedin]': 'personal.linkedinUrl',
  'urls[github]': 'personal.githubUrl',
  'urls[portfolio]': 'personal.portfolioUrl',
};

export const leverAdapter: Adapter = {
  id: 'lever',
  matches: (ctx) =>
    ctx.hostname.endsWith('lever.co') ||
    (ctx.document?.querySelector('form[action*="lever"], .application-form') != null),
  getStepPlan: () => ({
    singlePage: true,
    steps: ['Resume/CV', 'Personal information', 'Links', 'Additional questions', 'Submit'],
    notes: [
      'Lever puts everything on one page.',
      '"Company" (name="org") is the candidate\'s current employer.',
      'Work history / education are usually free-text "Additional information", not structured.',
    ],
  }),
  resolveField: (d: FieldDescriptor) => {
    const name = normalize(d.name).replace(/\s+/g, '');
    const rawName = (d.name ?? '').toLowerCase().replace(/\s+/g, '');
    const target = NAME_MAP[rawName] ?? NAME_MAP[name];
    if (target) {
      const conf = rawName === 'location' ? 0.6 : 0.95;
      return { target, confidence: conf, reason: `Lever name="${d.name}"` };
    }
    if (rawName.startsWith('urls[') && !rawName.includes('twitter')) {
      return { target: 'personal.portfolioUrl', confidence: 0.45, reason: `Lever url field ${d.name}` };
    }
    return null;
  },
  quirks: [
    'Custom questions use name="cards[uuid][fieldN]" — no stable mapping, resolver-only.',
    'The consent/GDPR checkboxes must be ticked by the user, not the extension.',
  ],
};
