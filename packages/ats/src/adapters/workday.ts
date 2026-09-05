import type { Adapter, FieldDescriptor, TargetKey } from '../types';
import { normalize } from '../normalize';

/**
 * Workday (*.myworkdayjobs.com) — React SPA. Controls carry `data-automation-id`.
 * Common ids (stable across most tenants):
 *   legalNameSection_firstName / _lastName
 *   addressSection_addressLine1 / _city / _countryRegion / _postalCode
 *   email / phone-number / phone-device-type
 *   dateOfBirth (Voluntary Disclosures on some tenants)
 *   workExperience-<n>: jobTitle, company, location, currentlyWorkThisRole,
 *     startDate (month/year sub-widgets), endDate
 *   education-<n>: schoolName, degree, fieldOfStudy, gradeAverage,
 *     firstYearAttended, lastYearAttended
 *
 * VERIFY LIVE: the workExperience-/education- prefixes and the date sub-widget
 * automation ids vary by tenant Workday version — capture from a real posting.
 */
const AID_MAP: Array<[RegExp, TargetKey, string]> = [
  [/legalNameSection.*first/i, 'personal.firstName', 'first name'],
  [/legalNameSection.*last/i, 'personal.lastName', 'last name'],
  [/preferredNameSection.*first/i, 'personal.preferredName', 'preferred name'],
  [/^email$|emailAddress/i, 'personal.email', 'email'],
  [/phone-?number/i, 'personal.phone', 'phone'],
  [/addressSection.*addressLine1|address-?line-?1/i, 'personal.addressLine1', 'address line 1'],
  [/addressSection.*addressLine2|address-?line-?2/i, 'personal.addressLine2', 'address line 2'],
  [/addressSection.*city|municipality/i, 'personal.city', 'city'],
  [/addressSection.*(region|state|countyName)/i, 'personal.region', 'region'],
  [/addressSection.*(postalCode|postal-?code)/i, 'personal.postcode', 'postcode'],
  [/addressSection.*countryRegion|country-?region|^country$/i, 'personal.country', 'country'],
  [/dateOfBirth|dob/i, 'personal.dateOfBirth', 'date of birth'],
];

function indexed(aid: string, kind: 'workExperience' | 'education'): number {
  const m = aid.match(new RegExp(`${kind}-?(\\d+)`, 'i'));
  return m ? Math.max(0, Number(m[1]) - 1) : 0;
}

export const workdayAdapter: Adapter = {
  id: 'workday',
  matches: (ctx) =>
    ctx.hostname.endsWith('myworkdayjobs.com') ||
    ctx.hostname.endsWith('myworkdaysite.com') ||
    ctx.document?.querySelector('[data-automation-id]') != null,
  getStepPlan: () => ({
    singlePage: false,
    steps: [
      'My Information',
      'My Experience (Work Experience, Education, Skills, Websites)',
      'Application Questions',
      'Voluntary Disclosures',
      'Self Identify',
      'Review',
      'Submit',
    ],
    notes: [
      'Multi-page wizard — the extension fills the current page only, never clicks Next.',
      'Each Work Experience / Education entry is added with its own "Add" button first.',
      'Company / School / Country are prompt pickers — the extension types then selects.',
      'Dates are split month + year sub-fields.',
    ],
  }),
  resolveField: (d: FieldDescriptor) => {
    const aid = d.attrs?.['data-automation-id'] ?? d.attrs?.dataAutomationId ?? '';
    const key = aid || d.name || d.id || '';
    if (!key) return null;

    for (const [re, target, label] of AID_MAP) {
      if (re.test(key)) return { target, confidence: 0.9, reason: `Workday ${label}` };
    }

    if (/workExperience/i.test(key)) {
      const i = indexed(key, 'workExperience');
      if (/jobTitle|title/i.test(key)) return { target: `experience.${i}.jobTitle` as TargetKey, confidence: 0.88, reason: 'Workday job title' };
      if (/company|employer/i.test(key)) return { target: `experience.${i}.employer` as TargetKey, confidence: 0.88, reason: 'Workday company' };
      if (/location/i.test(key)) return { target: `experience.${i}.location` as TargetKey, confidence: 0.8, reason: 'Workday location' };
      if (/currentlyWork|currentRole/i.test(key)) return { target: `experience.${i}.current` as TargetKey, confidence: 0.85, reason: 'Workday currently works here' };
      if (/description|roleDescription/i.test(key)) return { target: `experience.${i}.description` as TargetKey, confidence: 0.8, reason: 'Workday role description' };
      if (/startDate|from/i.test(key)) return { target: `experience.${i}.startDate` as TargetKey, confidence: 0.75, reason: 'Workday start date' };
      if (/endDate|to/i.test(key)) return { target: `experience.${i}.endDate` as TargetKey, confidence: 0.75, reason: 'Workday end date' };
    }

    if (/education/i.test(key)) {
      const i = indexed(key, 'education');
      if (/schoolName|school|university/i.test(key)) return { target: `education.${i}.institution` as TargetKey, confidence: 0.88, reason: 'Workday school' };
      if (/degree/i.test(key)) return { target: `education.${i}.qualificationType` as TargetKey, confidence: 0.85, reason: 'Workday degree' };
      if (/fieldOfStudy|field/i.test(key)) return { target: `education.${i}.fieldOfStudy` as TargetKey, confidence: 0.85, reason: 'Workday field of study' };
      if (/grade|gpa/i.test(key)) return { target: `education.${i}.gradeValue` as TargetKey, confidence: 0.8, reason: 'Workday grade' };
      if (/firstYear|from/i.test(key)) return { target: `education.${i}.startDate` as TargetKey, confidence: 0.7, reason: 'Workday first year' };
      if (/lastYear|to/i.test(key)) return { target: `education.${i}.endDate` as TargetKey, confidence: 0.7, reason: 'Workday last year' };
    }

    // Country prompt without a section prefix
    if (/country/i.test(normalize(d.label ?? d.ariaLabel ?? key))) {
      return { target: 'personal.country', confidence: 0.6, reason: 'Workday country prompt' };
    }
    return null;
  },
  quirks: [
    'Autofill-with-Resume on step 1 pre-parses the CV and often mis-maps — extension fills the structured fields afterwards.',
    'Prompt pickers reject typed values that are not in their list; unmatched picks go to review.',
    'Some tenants gate the whole application behind account creation — the user must do that.',
  ],
};
