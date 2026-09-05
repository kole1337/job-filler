import type { Adapter, FieldDescriptor, TargetKey } from '../types';
import { normalize } from '../normalize';

/**
 * Workday (*.myworkdayjobs.com) — React SPA. Every control sits in a wrapper
 * `<div data-automation-id="formField-<name>">` (captured as `attrs.formField`
 * by dom-extract), and the input itself often has its own `data-automation-id`
 * using `--` separators.
 *
 * My Information — confirmed live (Barclays wd3, 2026):
 *   formField-legalName--firstName  (input aid name--legalName--firstName)  "Given Name(s)"
 *   formField-legalName--middleName / --lastName / --title (Prefix)
 *   formField-preferredCheck        "I have a preferred name"
 *   formField-country               "Country" (prompt picker)
 *   formField-addressLine1 / 2 / 3  (input aid address--addressLine1 ...)
 *   formField-city                  "City or Town"
 *   formField-countryRegion         "County" (region, prompt picker)
 *   formField-postalCode            "Postal Code"
 *   formField-phoneType             "Phone Device Type" (prompt — needs "Mobile")
 *   formField-countryPhoneCode      "Country Phone Code" (prompt)
 *   formField-phoneNumber           "Phone Number"
 *   formField-source                "How Did You Hear About Us?"
 *   formField-candidateIsPreviousWorker  radios "previously worked here?"
 *   (no email field — Workday uses the account email; no DoB on this step)
 *
 * My Experience → Education — confirmed live (Barclays wd3, 2026), fields render
 * after "Add" and are NOT index-suffixed on a single entry:
 *   formField-school            "School or University"   (prompt picker)
 *   formField-degree            "Degree"                 (prompt picker)
 *   formField-fieldOfStudy      "Field of Study"         (text)
 *   formField-gradeAverage      "Overall Result (GPA)"   (text)
 *   formField-firstYearAttended "From"                   (year-only, dateSectionYear-input)
 *   formField-lastYearAttended  "To (Actual or Expected)" (year-only)
 *
 * My Experience → Work Experience — still R. Many tenants (Barclays incl.) omit
 * the Work Experience section entirely; `workExperience-<n>-*` unverified.
 */
const AID_MAP: Array<[RegExp, TargetKey, string]> = [
  [/legalName-?-?firstName|legalNameSection.*first/i, 'personal.firstName', 'first name'],
  [/legalName-?-?middleName/i, 'personal.middleName', 'middle name'],
  [/legalName-?-?lastName|legalNameSection.*last/i, 'personal.lastName', 'last name'],
  [/preferredName-?-?firstName|preferredNameSection.*first/i, 'personal.preferredName', 'preferred name'],
  [/^formField-email$|emailAddress|^email$/i, 'personal.email', 'email'],
  [/formField-phoneNumber|phoneNumber-?-?phoneNumber|phone-?number/i, 'personal.phone', 'phone'],
  [/formField-countryPhoneCode|countryPhoneCode/i, 'personal.phoneCountry', 'country phone code'],
  [/formField-addressLine1|address-?-?addressLine1|address-?line-?1/i, 'personal.addressLine1', 'address line 1'],
  [/formField-addressLine2|address-?-?addressLine2|address-?line-?2/i, 'personal.addressLine2', 'address line 2'],
  [/formField-city|address-?-?city|addressSection.*city|municipality/i, 'personal.city', 'city'],
  [/formField-countryRegion|address-?-?countyName|addressSection.*(region|state|countyName)/i, 'personal.region', 'region/county'],
  [/formField-postalCode|address-?-?postalCode|postal-?code/i, 'personal.postcode', 'postcode'],
  [/formField-country\b|countryRegion|country-?region/i, 'personal.country', 'country'],
  [/dateOfBirth|dob/i, 'personal.dateOfBirth', 'date of birth'],
  [/formField-source\b|source-?-?source/i, 'custom.how-did-you-hear', 'how did you hear about us'],
];

export const workdayAdapter: Adapter = {
  id: 'workday',
  matches: (ctx) =>
    ctx.hostname.endsWith('myworkdayjobs.com') ||
    ctx.hostname.endsWith('myworkdaysite.com') ||
    ctx.document?.querySelector('[data-automation-id]') != null,
  getStepPlan: () => ({
    singlePage: false,
    steps: [
      'Create Account / Sign In',
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
    const formField = d.attrs?.formField ?? '';
    const key = [formField, aid, d.name, d.id].filter(Boolean).join(' ');
    if (!key) return null;

    for (const [re, target, label] of AID_MAP) {
      if (re.test(key)) return { target, confidence: 0.9, reason: `Workday ${label}` };
    }

    if (/workExperience/i.test(key)) {
      // sectionIndex is assigned by dom-extract in DOM order (1st block on the
      // page = 0), never from the ids Workday stamps on the blocks.
      const i = d.sectionIndex ?? 0;
      if (/jobTitle|title/i.test(key)) return { target: `experience.${i}.jobTitle` as TargetKey, confidence: 0.88, reason: 'Workday job title' };
      if (/company|employer/i.test(key)) return { target: `experience.${i}.employer` as TargetKey, confidence: 0.88, reason: 'Workday company' };
      if (/location/i.test(key)) return { target: `experience.${i}.location` as TargetKey, confidence: 0.8, reason: 'Workday location' };
      if (/currentlyWork|currentRole/i.test(key)) return { target: `experience.${i}.current` as TargetKey, confidence: 0.85, reason: 'Workday currently works here' };
      if (/description|roleDescription/i.test(key)) return { target: `experience.${i}.description` as TargetKey, confidence: 0.8, reason: 'Workday role description' };
      if (/startDate|from/i.test(key)) return { target: `experience.${i}.startDate` as TargetKey, confidence: 0.75, reason: 'Workday start date' };
      if (/endDate|to/i.test(key)) return { target: `experience.${i}.endDate` as TargetKey, confidence: 0.75, reason: 'Workday end date' };
    }

    // Education — matched by the confirmed formField names (not "education"-tokened).
    {
      const i = d.sectionIndex ?? 0;
      if (/formField-school\b|schoolName|\buniversity\b/i.test(key))
        return { target: `education.${i}.institution` as TargetKey, confidence: 0.85, reason: 'Workday school' };
      if (/formField-degree\b|\bdegree\b/i.test(key))
        return { target: `education.${i}.qualificationType` as TargetKey, confidence: 0.6, reason: 'Workday degree (prompt — confirm)' };
      if (/formField-fieldOfStudy|fieldOfStudy/i.test(key))
        return { target: `education.${i}.fieldOfStudy` as TargetKey, confidence: 0.85, reason: 'Workday field of study' };
      if (/formField-gradeAverage|gradeAverage|\bgpa\b/i.test(key))
        return { target: `education.${i}.gradeValue` as TargetKey, confidence: 0.8, reason: 'Workday overall result' };
      if (/formField-firstYearAttended|firstYear/i.test(key))
        return { target: `education.${i}.startYear` as TargetKey, confidence: 0.75, reason: 'Workday first year attended' };
      if (/formField-lastYearAttended|lastYear/i.test(key))
        return { target: `education.${i}.endYear` as TargetKey, confidence: 0.75, reason: 'Workday last year attended' };
    }

    // Country prompt without a section prefix
    if (/country/i.test(normalize(d.label ?? d.ariaLabel ?? key))) {
      return { target: 'personal.country', confidence: 0.6, reason: 'Workday country prompt' };
    }
    return null;
  },
  quirks: [
    'My Information has no email or date-of-birth field — Workday uses the account email; DoB (if asked) is under Voluntary Disclosures.',
    '"Phone Device Type", "Country Phone Code", "Country" and "County" are prompt pickers — type then pick; unmatched values go to review.',
    'Autofill-with-Resume on step 1 pre-parses the CV and often mis-maps — the extension fills the structured fields afterwards.',
    'Work Experience / Education blocks only appear after their "Add" button is clicked.',
    'Most tenants (Barclays, NVIDIA seen) gate the whole application behind account creation — the user must do that first.',
  ],
};
