import type { Adapter, FieldDescriptor, TargetKey } from '../types';
import { normalize } from '../normalize';

/**
 * Greenhouse.
 *   Classic board (boards.greenhouse.io / embedded via grnh.se iframe):
 *     #first_name #last_name #email #phone
 *     #job_application_answers_attributes_<n>_... for custom questions
 *     education section: #candidate_education_records_... (school, degree, discipline,
 *       start/end year), "Add another" button
 *     employment section: #candidate_employment_records_... (company, title, start/end)
 *   New React board (job-boards.greenhouse.io):
 *     inputs keyed by id^="question_" with aria-label / label text — resolver handles these.
 *
 * VERIFY LIVE: the React board is now the default for new customers; confirm which
 * markup the target posting uses and whether education/employment blocks still render.
 */
// Confirmed live (job-boards.greenhouse.io React board, 2026): personal fields
// carry a real `id` (first_name/last_name/email/phone/country) with `name` empty,
// plus <label for> and aria-label. `country` is an intl-tel-input style combobox.
const ID_MAP: Record<string, TargetKey> = {
  first_name: 'personal.firstName',
  last_name: 'personal.lastName',
  email: 'personal.email',
  phone: 'personal.phone',
  country: 'personal.country',
};

function classicEducation(id: string): { target: TargetKey; reason: string } | null {
  const m = id.match(/education_records_attributes_(\d+)_(\w+)/);
  if (!m) return null;
  const i = Number(m[1]);
  const field = m[2]!;
  const map: Record<string, string> = {
    school_name_id: 'institution',
    degree_id: 'qualificationType',
    discipline_id: 'fieldOfStudy',
    start_date: 'startDate',
    end_date: 'endDate',
  };
  const key = map[field];
  return key ? { target: `education.${i}.${key}` as TargetKey, reason: `GH education[${i}].${field}` } : null;
}

function classicEmployment(id: string): { target: TargetKey; reason: string } | null {
  const m = id.match(/employment_records_attributes_(\d+)_(\w+)/);
  if (!m) return null;
  const i = Number(m[1]);
  const field = m[2]!;
  const map: Record<string, string> = {
    company_name: 'employer',
    title: 'jobTitle',
    start_date: 'startDate',
    end_date: 'endDate',
    current: 'current',
  };
  const key = map[field];
  return key ? { target: `experience.${i}.${key}` as TargetKey, reason: `GH employment[${i}].${field}` } : null;
}

export const greenhouseAdapter: Adapter = {
  id: 'greenhouse',
  matches: (ctx) =>
    /greenhouse\.io$/.test(ctx.hostname) ||
    ctx.hostname === 'grnh.se' ||
    ctx.document?.querySelector('#application_form, [id^="grnhse"], form[action*="greenhouse"]') != null,
  getStepPlan: () => ({
    singlePage: true,
    steps: [
      'Resume/CV upload',
      'Personal information',
      'Education (repeatable)',
      'Employment (repeatable)',
      'Additional questions',
      'Demographic questions (optional)',
      'Submit',
    ],
    notes: [
      'Usually one long page; "Add another" adds education/employment rows.',
      'Country and school are async autocompletes — type then pick.',
      'Demographic questions are voluntary; only filled from opted-in custom answers.',
    ],
  }),
  resolveField: (d: FieldDescriptor) => {
    const id = (d.id ?? d.name ?? '').toLowerCase();
    const bare = id.replace(/^job_application_/, '').replace(/^candidate_/, '');

    if (ID_MAP[bare]) return { target: ID_MAP[bare]!, confidence: 0.95, reason: `GH #${bare}` };

    const edu = classicEducation(id);
    if (edu) return { ...edu, confidence: 0.9 };
    const emp = classicEmployment(id);
    if (emp) return { ...emp, confidence: 0.9 };

    if (/auto_?complete|_id$/.test(id) && /country/.test(normalize(d.label ?? d.ariaLabel ?? id))) {
      return { target: 'personal.country', confidence: 0.7, reason: 'GH country autocomplete' };
    }
    return null;
  },
  quirks: [
    'Custom questions (id^="question_" / *_answers_attributes_*) have no fixed mapping.',
    'React board renders <select> as a listbox combobox — open, type, pick.',
    '"Add another" must be clicked to reveal extra education/employment rows before filling them.',
  ],
};
