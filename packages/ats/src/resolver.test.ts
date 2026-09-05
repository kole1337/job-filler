import { describe, expect, it } from 'vitest';
import type { Profile } from '@job-filler/shared';
import { flattenProfile } from './flatten';
import { resolveFields } from './resolver';
import { contextFromLocation } from './detect';
import { leverAdapter } from './adapters/lever';
import { greenhouseAdapter } from './adapters/greenhouse';
import { ashbyAdapter } from './adapters/ashby';
import { workdayAdapter } from './adapters/workday';
import { genericAdapter } from './adapters/generic';
import type { FieldDescriptor } from './types';

const profile: Profile = {
  personal: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '+447700900123',
    country: 'GB',
    linkedinUrl: 'https://linkedin.com/in/ada',
    city: 'London',
  },
  education: [
    {
      institution: 'University of London',
      qualificationType: 'BSc',
      fieldOfStudy: 'Mathematics',
      gradeType: 'UK_HONOURS',
      gradeValue: 'Upper Second Class Honours (2:1)',
      current: false,
    },
  ],
  experience: [
    { jobTitle: 'Analyst', employer: 'Acme Ltd', startDate: '2021-01', current: true },
  ],
  customAnswers: [{ key: 'notice-period', label: 'Notice period', value: '1 month', matchHints: [], sensitive: false }],
};

const flat = flattenProfile(profile);
const ctx = contextFromLocation('https://jobs.lever.co/acme/123', undefined);

const d = (p: Partial<FieldDescriptor>): FieldDescriptor => ({ ref: 'r', kind: 'text', ...p });

describe('resolver + Lever playbook', () => {
  it('maps name/email/phone from Lever name attrs with high confidence', () => {
    const res = resolveFields(
      [
        d({ name: 'name', kind: 'text' }),
        d({ name: 'email', kind: 'email' }),
        d({ name: 'phone', kind: 'tel' }),
      ],
      flat,
      leverAdapter,
      ctx,
    );
    const byTarget = Object.fromEntries(res.autofill.map((m) => [m.target, m.value]));
    expect(byTarget['personal.fullName']).toBe('Ada Lovelace');
    expect(byTarget['personal.email']).toBe('ada@example.com');
    expect(byTarget['personal.phone']).toBe('+447700900123');
  });
});

describe('resolver keyword fallback', () => {
  it('matches a labelled first-name field with no playbook', () => {
    const res = resolveFields([d({ label: 'First name', name: 'x1' })], flat, genericAdapter, ctx);
    expect(res.autofill[0]?.target).toBe('personal.firstName');
  });

  it('does not fill "Confirm email"', () => {
    const res = resolveFields([d({ label: 'Confirm email address', kind: 'email' })], flat, genericAdapter, ctx);
    expect(res.autofill).toHaveLength(0);
  });

  it('routes an unknown required field to unmatched', () => {
    const res = resolveFields(
      [d({ label: 'What is your favourite colour?', required: true })],
      flat,
      genericAdapter,
      ctx,
    );
    expect(res.unmatched).toHaveLength(1);
  });

  it('sends a select with no matching option to review', () => {
    const res = resolveFields(
      [
        d({
          label: 'Degree',
          kind: 'select',
          sectionIndex: 0,
          options: [
            { value: 'hs', label: 'High School' },
            { value: 'phd', label: 'Doctorate' },
          ],
        }),
      ],
      flat,
      genericAdapter,
      ctx,
    );
    expect(res.review.some((m) => m.target === 'education.0.qualificationType')).toBe(true);
  });

  it('matches a Bachelors option via synonyms', () => {
    const res = resolveFields(
      [
        d({
          label: 'Degree type',
          kind: 'select',
          sectionIndex: 0,
          options: [
            { value: 'b', label: "Bachelor's Degree" },
            { value: 'm', label: "Master's Degree" },
          ],
        }),
      ],
      flat,
      genericAdapter,
      ctx,
    );
    const m = [...res.autofill, ...res.review].find((x) => x.target === 'education.0.qualificationType');
    expect(m?.value).toBe('b');
  });
});

describe('live-verified adapter mappings (2026)', () => {
  it('Lever: org -> current employer, location -> city', () => {
    const res = resolveFields(
      [d({ name: 'org' }), d({ name: 'location', id: 'location-input' })],
      flat,
      leverAdapter,
      ctx,
    );
    const all = [...res.autofill, ...res.review];
    expect(all.find((m) => m.descriptor.name === 'org')?.target).toBe('experience.0.employer');
    expect(all.find((m) => m.descriptor.name === 'location')?.target).toBe('personal.city');
  });

  it('Ashby: _systemfield_email and phone map by name', () => {
    const actx = contextFromLocation('https://jobs.ashbyhq.com/acme/x/application', undefined);
    const res = resolveFields(
      [d({ name: '_systemfield_email', kind: 'email' }), d({ name: 'phone', kind: 'tel' }), d({ name: 'currentCompany' })],
      flat,
      ashbyAdapter,
      actx,
    );
    const all = [...res.autofill, ...res.review];
    expect(all.find((m) => m.descriptor.name === '_systemfield_email')?.target).toBe('personal.email');
    expect(all.find((m) => m.descriptor.name === 'phone')?.target).toBe('personal.phone');
    expect(all.find((m) => m.descriptor.name === 'currentCompany')?.target).toBe('experience.0.employer');
  });

  it('Greenhouse React board: #country, #candidate-location, school--0/degree--0', () => {
    const gctx = contextFromLocation('https://job-boards.greenhouse.io/acme/jobs/1', undefined);
    const res = resolveFields(
      [
        d({ id: 'country', label: 'Country', kind: 'text' }),
        d({ id: 'candidate-location', label: 'Location (City)', kind: 'text' }),
        d({ id: 'school--0', label: 'School', kind: 'combobox', sectionIndex: 0 }),
        d({ id: 'degree--0', label: 'Degree', kind: 'combobox', sectionIndex: 0 }),
      ],
      flat,
      greenhouseAdapter,
      gctx,
    );
    const t = Object.fromEntries([...res.autofill, ...res.review].map((m) => [m.descriptor.id, m.target]));
    expect(t['country']).toBe('personal.country');
    expect(t['candidate-location']).toBe('personal.city');
    expect(t['school--0']).toBe('education.0.institution');
    expect(t['degree--0']).toBe('education.0.qualificationType');
  });
});

describe('Workday My Information (Barclays wd3, live)', () => {
  const wctx = contextFromLocation('https://barclays.wd3.myworkdayjobs.com/x', undefined);
  const wflat = {
    ...flat,
    'personal.addressLine1': '10 Downing Street',
    'personal.postcode': 'SW1A 2AA',
    'personal.region': 'Greater London',
    'personal.phoneCountry': 'GB',
  };
  const f = (formField: string, extra: Partial<FieldDescriptor> = {}): FieldDescriptor => ({
    ref: 'r',
    kind: 'text',
    attrs: { formField },
    ...extra,
  });

  it('maps legalName, address, phone and county correctly', () => {
    const res = resolveFields(
      [
        f('formField-legalName--firstName', { attrs: { formField: 'formField-legalName--firstName', 'data-automation-id': 'name--legalName--firstName' } }),
        f('formField-legalName--lastName'),
        f('formField-addressLine1'),
        f('formField-city'),
        f('formField-countryRegion'),
        f('formField-postalCode'),
        f('formField-phoneNumber', { kind: 'text' }),
        f('formField-countryPhoneCode'),
        f('formField-source'),
      ],
      wflat,
      workdayAdapter,
      wctx,
    );
    const t = Object.fromEntries(
      [...res.autofill, ...res.review].map((m) => [m.descriptor.attrs!.formField, m.target]),
    );
    expect(t['formField-legalName--firstName']).toBe('personal.firstName');
    expect(t['formField-legalName--lastName']).toBe('personal.lastName');
    expect(t['formField-addressLine1']).toBe('personal.addressLine1');
    expect(t['formField-city']).toBe('personal.city');
    expect(t['formField-countryRegion']).toBe('personal.region');
    expect(t['formField-postalCode']).toBe('personal.postcode');
    expect(t['formField-phoneNumber']).toBe('personal.phone');
  });

  it('maps the Education block (school/degree/fieldOfStudy/gradeAverage/years)', () => {
    const res = resolveFields(
      [
        f('formField-school'),
        f('formField-degree'),
        f('formField-fieldOfStudy'),
        f('formField-gradeAverage'),
        f('formField-firstYearAttended', { attrs: { formField: 'formField-firstYearAttended', 'data-automation-id': 'dateSectionYear-input' } }),
        f('formField-lastYearAttended', { attrs: { formField: 'formField-lastYearAttended', 'data-automation-id': 'dateSectionYear-input' } }),
      ],
      { ...wflat, 'education.0.startYear': '2019', 'education.0.endYear': '2022', 'education.0.fieldOfStudy': 'Maths', 'education.0.gradeValue': '2:1' },
      workdayAdapter,
      wctx,
    );
    const all = [...res.autofill, ...res.review];
    const t = Object.fromEntries(all.map((m) => [m.descriptor.attrs!.formField, m.target]));
    expect(t['formField-school']).toBe('education.0.institution');
    expect(t['formField-degree']).toBe('education.0.qualificationType');
    expect(t['formField-fieldOfStudy']).toBe('education.0.fieldOfStudy');
    expect(t['formField-gradeAverage']).toBe('education.0.gradeValue');
    expect(all.find((m) => m.descriptor.attrs!.formField === 'formField-firstYearAttended')?.value).toBe('2019');
    // degree is a prompt picker -> routed to review, not autofill
    expect(res.review.some((m) => m.target === 'education.0.qualificationType')).toBe(true);
  });

  it('does not confuse countryRegion / countryPhoneCode with country', () => {
    const res = resolveFields(
      [f('formField-country'), f('formField-countryRegion'), f('formField-countryPhoneCode')],
      wflat,
      workdayAdapter,
      wctx,
    );
    const t = Object.fromEntries(
      [...res.autofill, ...res.review].map((m) => [m.descriptor.attrs!.formField, m.target]),
    );
    expect(t['formField-country']).toBe('personal.country');
    expect(t['formField-countryRegion']).toBe('personal.region');
    expect(t['formField-countryPhoneCode']).toBe('personal.phoneCountry');
  });
});

describe('Greenhouse classic ids', () => {
  it('maps education record attributes to the right index', () => {
    const res = resolveFields(
      [d({ id: 'candidate_education_records_attributes_0_school_name_id', label: 'School' })],
      flat,
      greenhouseAdapter,
      contextFromLocation('https://boards.greenhouse.io/acme/jobs/1', undefined),
    );
    expect([...res.autofill, ...res.review][0]?.target).toBe('education.0.institution');
  });
});
