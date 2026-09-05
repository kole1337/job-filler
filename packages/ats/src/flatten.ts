import type { Profile } from '@job-filler/shared';

const UK_HONOURS_SHORT: Record<string, string> = {
  'first class honours': 'First',
  'upper second class honours (2:1)': '2:1',
  'lower second class honours (2:2)': '2:2',
  'third class honours': 'Third',
};

/** Map a stored grade to a compact form some ATS dropdowns expect ("2:1", "First"). */
export function shortGrade(gradeValue?: string): string | undefined {
  if (!gradeValue) return undefined;
  return UK_HONOURS_SHORT[gradeValue.toLowerCase()] ?? gradeValue;
}

export function fullName(p: Profile['personal']): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
}

/**
 * Produce a lookup table of `TargetKey -> string value` for the current profile,
 * expanding the education/experience arrays. Booleans become 'Yes'/'No'.
 * Dates stay in `YYYY-MM` / `YYYY-MM-DD`; adapters reformat per control.
 */
export function flattenProfile(profile: Profile): Record<string, string> {
  const out: Record<string, string> = {};
  const yn = (b: boolean | undefined) => (b === undefined ? '' : b ? 'Yes' : 'No');
  const p = profile.personal;

  out['personal.firstName'] = p.firstName ?? '';
  out['personal.middleName'] = p.middleName ?? '';
  out['personal.lastName'] = p.lastName ?? '';
  out['personal.preferredName'] = p.preferredName ?? '';
  out['personal.fullName'] = fullName(p);
  out['personal.dateOfBirth'] = p.dateOfBirth ?? '';
  out['personal.email'] = p.email ?? '';
  out['personal.phone'] = p.phone ?? '';
  out['personal.addressLine1'] = p.addressLine1 ?? '';
  out['personal.addressLine2'] = p.addressLine2 ?? '';
  out['personal.city'] = p.city ?? '';
  out['personal.region'] = p.region ?? '';
  out['personal.postcode'] = p.postcode ?? '';
  out['personal.country'] = p.country ?? '';
  out['personal.nationality'] = p.nationality ?? '';
  out['personal.rightToWorkUK'] = yn(p.rightToWorkUK);
  out['personal.needsVisaSponsorship'] = yn(p.needsVisaSponsorship);
  out['personal.linkedinUrl'] = p.linkedinUrl ?? '';
  out['personal.portfolioUrl'] = p.portfolioUrl ?? '';
  out['personal.githubUrl'] = p.githubUrl ?? '';

  profile.education.forEach((e, i) => {
    out[`education.${i}.institution`] = e.institution ?? '';
    out[`education.${i}.qualificationType`] = e.qualificationType ?? '';
    out[`education.${i}.fieldOfStudy`] = e.fieldOfStudy ?? '';
    out[`education.${i}.gradeValue`] = e.gradeValue ?? '';
    out[`education.${i}.gradeValueShort`] = shortGrade(e.gradeValue) ?? '';
    out[`education.${i}.startDate`] = e.startDate ?? '';
    out[`education.${i}.endDate`] = e.endDate ?? '';
    out[`education.${i}.startYear`] = e.startDate?.slice(0, 4) ?? '';
    out[`education.${i}.endYear`] = e.endDate?.slice(0, 4) ?? '';
    out[`education.${i}.current`] = yn(e.current);
    out[`education.${i}.description`] = e.description ?? '';
  });

  profile.experience.forEach((e, i) => {
    out[`experience.${i}.jobTitle`] = e.jobTitle ?? '';
    out[`experience.${i}.employer`] = e.employer ?? '';
    out[`experience.${i}.location`] = e.location ?? '';
    out[`experience.${i}.startDate`] = e.startDate ?? '';
    out[`experience.${i}.endDate`] = e.endDate ?? '';
    out[`experience.${i}.startYear`] = e.startDate?.slice(0, 4) ?? '';
    out[`experience.${i}.endYear`] = e.endDate?.slice(0, 4) ?? '';
    out[`experience.${i}.current`] = yn(e.current);
    out[`experience.${i}.description`] = e.description ?? '';
  });

  for (const c of profile.customAnswers) {
    out[`custom.${c.key}`] = c.value ?? '';
  }

  return out;
}
