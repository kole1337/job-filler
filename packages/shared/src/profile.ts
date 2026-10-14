import { z } from 'zod';

/**
 * The canonical shape of a user's job-application profile.
 *
 * This module is the single source of truth shared by:
 *   - apps/web        (validates API input/output, drives the dashboard forms)
 *   - packages/ats    (maps ATS form fields onto these keys)
 *   - packages/extension (trusts data fetched from the portal API)
 */

/** ISO date string, `YYYY-MM-DD`. We keep dates as strings to dodge timezone drift. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format');

/** `YYYY-MM` — used by month/year pickers common in Workday/Greenhouse history sections. */
export const isoMonth = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Expected a month in YYYY-MM format');

const optionalUrl = z
  .string()
  .trim()
  .url('Enter a valid URL (including https://)')
  .max(2048)
  .optional()
  .or(z.literal('').transform(() => undefined));

const shortText = z.string().trim().max(200);
const longText = z.string().trim().max(5000);

/* -------------------------------------------------------------------------- */
/*  Personal details                                                          */
/* -------------------------------------------------------------------------- */

export const personalSchema = z.object({
  firstName: shortText.min(1, 'First name is required'),
  middleName: shortText.optional(),
  lastName: shortText.min(1, 'Last name is required'),
  preferredName: shortText.optional(),
  dateOfBirth: isoDate.optional(),
  /**
   * Required string (not `optional()`) so `personal.email` stays a plain
   * `string` everywhere it's used — but a brand-new local profile that's
   * never been saved starts with `email: ''`, so empty is allowed here and
   * only checked for a valid *format* when it's non-empty.
   */
  email: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, {
      message: 'Enter a valid email address',
    }),
  /** E.164 preferred, e.g. +447700900123. */
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s-]{6,20}$/, 'Enter a valid phone number')
    .optional(),
  phoneCountry: z.string().trim().length(2).toUpperCase().optional(), // ISO 3166-1 alpha-2

  addressLine1: shortText.optional(),
  addressLine2: shortText.optional(),
  city: shortText.optional(),
  /** County / region / state. */
  region: shortText.optional(),
  postcode: shortText.optional(),
  /** ISO 3166-1 alpha-2, defaults to GB in the UI. */
  country: z.string().trim().length(2).toUpperCase().default('GB'),

  nationality: shortText.optional(),
  rightToWorkUK: z.boolean().optional(),
  needsVisaSponsorship: z.boolean().optional(),

  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
});
export type Personal = z.infer<typeof personalSchema>;

/* -------------------------------------------------------------------------- */
/*  Education (UK-focused)                                                     */
/* -------------------------------------------------------------------------- */

export const qualificationType = z.enum([
  'BSc',
  'BA',
  'BEng',
  'LLB',
  'MSc',
  'MA',
  'MEng',
  'MBA',
  'PhD',
  'PGDip',
  'HND',
  'FoundationDegree',
  'ALevel',
  'GCSE',
  'BTEC',
  'Other',
]);
export type QualificationType = z.infer<typeof qualificationType>;

/**
 * How the achievement is expressed. UK degrees usually use honours classifications;
 * some employers ask for a percentage or (for internationals) a GPA.
 */
export const gradeType = z.enum(['UK_HONOURS', 'PERCENTAGE', 'GPA', 'PASS_FAIL', 'OTHER']);
export type GradeType = z.infer<typeof gradeType>;

export const ukHonours = z.enum([
  'First Class Honours',
  'Upper Second Class Honours (2:1)',
  'Lower Second Class Honours (2:2)',
  'Third Class Honours',
  'Pass',
  'Distinction',
  'Merit',
]);

export const educationSchema = z
  .object({
    id: z.string().cuid().optional(),
    institution: shortText.min(1, 'University / school is required'),
    qualificationType: qualificationType,
    fieldOfStudy: shortText.optional(),
    gradeType: gradeType,
    /**
     * Free-form so it can hold "2:1", "First Class Honours", "72%", "3.8", "Merit".
     * The UI constrains input based on `gradeType`.
     */
    gradeValue: shortText.optional(),
    startDate: isoMonth.optional(),
    endDate: isoMonth.optional(),
    current: z.boolean().default(false),
    description: longText.optional(),
  })
  .refine((e) => e.current || !e.startDate || !e.endDate || e.startDate <= e.endDate, {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });
export type Education = z.infer<typeof educationSchema>;

/* -------------------------------------------------------------------------- */
/*  Work experience                                                           */
/* -------------------------------------------------------------------------- */

export const employmentType = z.enum([
  'FullTime',
  'PartTime',
  'Contract',
  'Internship',
  'Apprenticeship',
  'Temporary',
  'Volunteer',
  'SelfEmployed',
]);
export type EmploymentType = z.infer<typeof employmentType>;

export const experienceSchema = z
  .object({
    id: z.string().cuid().optional(),
    jobTitle: shortText.min(1, 'Job title is required'),
    employer: shortText.min(1, 'Employer is required'),
    location: shortText.optional(),
    employmentType: employmentType.optional(),
    startDate: isoMonth,
    endDate: isoMonth.optional(),
    /** True => this is the candidate's current job; `endDate` should be omitted. */
    current: z.boolean().default(false),
    description: longText.optional(),
  })
  .refine((e) => e.current || !!e.endDate, {
    message: 'Add an end date, or tick "I currently work here"',
    path: ['endDate'],
  })
  .refine((e) => e.current || !e.endDate || e.startDate <= e.endDate, {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });
export type Experience = z.infer<typeof experienceSchema>;

/* -------------------------------------------------------------------------- */
/*  Custom answers — anything the schema above does not cover                  */
/* -------------------------------------------------------------------------- */

/**
 * ATS forms routinely ask questions we can't model generically:
 * notice period, salary expectation, "how did you hear about us", pronouns,
 * voluntary EEO/diversity questions, cover letters, etc.
 *
 * The extension surfaces any unmapped required field and offers to save it here
 * so it is remembered for next time. The portal exposes these on /dashboard/extra.
 */
export const customAnswerSchema = z.object({
  id: z.string().cuid().optional(),
  /** Stable slug, e.g. `notice-period`. Used for matching on future forms. */
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens'),
  label: shortText.min(1),
  value: longText,
  /** Optional keyword hints that help the resolver match this to a form field. */
  matchHints: z.array(shortText).max(20).default([]),
  /** Retained metadata for saved custom answers. */
  sensitive: z.boolean().default(false),
});
export type CustomAnswer = z.infer<typeof customAnswerSchema>;

/* -------------------------------------------------------------------------- */
/*  Full profile bundle                                                       */
/* -------------------------------------------------------------------------- */

export const profileSchema = z.object({
  personal: personalSchema,
  education: z.array(educationSchema).max(20),
  experience: z.array(experienceSchema).max(40),
  customAnswers: z.array(customAnswerSchema).max(100),
  updatedAt: z.string().datetime().optional(),
});
export type Profile = z.infer<typeof profileSchema>;

/** Input accepted by `PUT /api/profile` for a *complete* profile. */
export const profileInputSchema = profileSchema.omit({ updatedAt: true });
export type ProfileInput = z.infer<typeof profileInputSchema>;

/**
 * Autosave / draft input — the dashboard persists partial work as the user types,
 * so the required-name and date-order rules are relaxed here. Completeness is
 * reported separately (see `profileCompleteness`).
 */
export const personalDraftSchema = personalSchema.extend({
  firstName: shortText.optional().default(''),
  lastName: shortText.optional().default(''),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const profileDraftSchema = z.object({
  personal: personalDraftSchema,
  education: z.array(educationSchema).max(20).default([]),
  experience: z.array(experienceSchema).max(40).default([]),
  customAnswers: z.array(customAnswerSchema).max(100).default([]),
});
export type ProfileDraft = z.infer<typeof profileDraftSchema>;

/**
 * What `GET /api/profile` returns: whatever the dashboard has saved so far, which
 * may be an unfinished draft (e.g. no last name yet). The extension fills what's
 * there and skips blanks, so only the shape is checked here, not completeness.
 */
export const savedProfileSchema = profileSchema.extend({
  personal: personalSchema.extend({ firstName: shortText, lastName: shortText }),
});

/** 0..1 fraction of the "core" profile that is filled in. */
export function profileCompleteness(p: Profile): number {
  const core = [
    p.personal.firstName,
    p.personal.lastName,
    p.personal.email,
    p.personal.phone,
    p.personal.dateOfBirth,
    p.personal.addressLine1,
    p.personal.city,
    p.personal.postcode,
    p.education.length ? 'y' : '',
    p.experience.length ? 'y' : '',
  ];
  return core.filter(Boolean).length / core.length;
}

export const emptyProfile = (email = ''): Profile => ({
  personal: {
    firstName: '',
    lastName: '',
    email,
    country: 'GB',
  },
  education: [],
  experience: [],
  customAnswers: [],
});

/** Seed suggestions the portal offers on first visit to /dashboard/extra. */
export const SUGGESTED_CUSTOM_ANSWERS: Array<Pick<CustomAnswer, 'key' | 'label' | 'matchHints'>> = [
  { key: 'notice-period', label: 'Notice period', matchHints: ['notice period', 'availability'] },
  {
    key: 'salary-expectation',
    label: 'Salary expectation',
    matchHints: ['salary', 'compensation expectation', 'desired salary'],
  },
  {
    key: 'willing-to-relocate',
    label: 'Willing to relocate?',
    matchHints: ['relocate', 'relocation'],
  },
  {
    key: 'requires-visa-sponsorship',
    label: 'Do you require visa sponsorship?',
    matchHints: ['sponsorship', 'visa', 'right to work'],
  },
  {
    key: 'earliest-start-date',
    label: 'Earliest start date',
    matchHints: ['start date', 'available to start'],
  },
  {
    key: 'how-did-you-hear',
    label: 'How did you hear about us?',
    matchHints: ['how did you hear', 'referral source', 'source'],
  },
  { key: 'pronouns', label: 'Pronouns', matchHints: ['pronoun'] },
  { key: 'gender', label: 'Gender', matchHints: ['gender'], },
  { key: 'ethnicity', label: 'Ethnicity', matchHints: ['ethnicity', 'race'] },
  {
    key: 'disability-status',
    label: 'Disability status',
    matchHints: ['disability', 'disabled'],
  },
];
