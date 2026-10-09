import { describe, expect, it } from 'vitest';
import {
  educationSchema,
  experienceSchema,
  profileInputSchema,
  profileDraftSchema,
  savedProfileSchema,
  emptyProfile,
} from './index';

describe('educationSchema', () => {
  it('accepts a UK honours result', () => {
    const parsed = educationSchema.parse({
      institution: 'University of Manchester',
      qualificationType: 'BSc',
      fieldOfStudy: 'Computer Science',
      gradeType: 'UK_HONOURS',
      gradeValue: 'Upper Second Class Honours (2:1)',
      startDate: '2019-09',
      endDate: '2022-06',
      current: false,
    });
    expect(parsed.gradeValue).toContain('2:1');
  });

  it('rejects an end date before the start date', () => {
    expect(() =>
      educationSchema.parse({
        institution: 'X',
        qualificationType: 'BA',
        gradeType: 'OTHER',
        startDate: '2022-06',
        endDate: '2019-09',
        current: false,
      }),
    ).toThrow();
  });
});

describe('experienceSchema', () => {
  it('requires an end date unless current', () => {
    expect(() =>
      experienceSchema.parse({
        jobTitle: 'Analyst',
        employer: 'Acme',
        startDate: '2021-01',
        current: false,
      }),
    ).toThrow();

    expect(
      experienceSchema.parse({
        jobTitle: 'Analyst',
        employer: 'Acme',
        startDate: '2021-01',
        current: true,
      }).current,
    ).toBe(true);
  });
});

describe('profileInputSchema', () => {
  it('rejects an empty profile as incomplete', () => {
    expect(() => profileInputSchema.parse(emptyProfile('a@b.com'))).toThrow();
  });

  it('accepts an empty profile as a draft', () => {
    expect(() => profileDraftSchema.parse(emptyProfile('a@b.com'))).not.toThrow();
  });

});

describe('savedProfileSchema', () => {
  it('accepts an unfinished profile, as the extension receives it', () => {
    const draft = emptyProfile();
    draft.personal.firstName = 'Ada';
    expect(() => savedProfileSchema.parse(draft)).not.toThrow();
  });
});
