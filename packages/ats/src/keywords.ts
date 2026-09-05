import type { ControlKind } from './types';

export interface KeywordRule {
  /** Base target key, without the array index (added by the resolver). */
  base: string;
  /** Section this rule belongs to — decides which array index gets substituted. */
  section: 'personal' | 'education' | 'experience';
  /** Phrases that, if present, strongly indicate this field. */
  positives: string[];
  /** Phrases that veto the match. */
  negatives?: string[];
  /** Control kinds this rule is plausible for (empty => any). */
  kinds?: ControlKind[];
  /** Base confidence when a positive matches (0..1). */
  weight: number;
}

/**
 * Ordered, most-specific-first. The resolver walks these and keeps the best score
 * per field. Negatives matter a lot here — e.g. "email" must not win "confirm email"
 * or "recruiter email".
 */
export const KEYWORD_RULES: KeywordRule[] = [
  // -- Personal: name ------------------------------------------------------
  {
    base: 'personal.firstName',
    section: 'personal',
    positives: ['first name', 'given name', 'forename', 'legal first name'],
    negatives: ['last', 'family', 'father', 'company first'],
    weight: 0.9,
  },
  {
    base: 'personal.lastName',
    section: 'personal',
    positives: ['last name', 'surname', 'family name', 'legal last name'],
    negatives: ['first', 'given', 'maiden'],
    weight: 0.9,
  },
  {
    base: 'personal.middleName',
    section: 'personal',
    positives: ['middle name', 'middle initial'],
    weight: 0.9,
  },
  {
    base: 'personal.preferredName',
    section: 'personal',
    positives: ['preferred name', 'preferred first name', 'nickname', 'known as'],
    weight: 0.85,
  },
  {
    base: 'personal.fullName',
    section: 'personal',
    positives: ['full name', 'name', 'your name', 'candidate name', 'legal name'],
    negatives: ['first', 'last', 'middle', 'user', 'company', 'employer', 'school', 'file', 'preferred', 'manager', 'reference'],
    weight: 0.55,
  },
  // -- Personal: contact -------------------------------------------------
  {
    base: 'personal.email',
    section: 'personal',
    positives: ['email', 'e mail', 'email address'],
    negatives: ['confirm', 're enter', 'recruiter', 'referrer', 'reference', 'manager'],
    kinds: ['email', 'text'],
    weight: 0.92,
  },
  {
    base: 'personal.phone',
    section: 'personal',
    positives: ['phone', 'telephone', 'mobile', 'cell', 'contact number', 'phone number'],
    negatives: ['country code', 'extension', 'work phone of'],
    kinds: ['tel', 'text', 'number'],
    weight: 0.9,
  },
  {
    base: 'personal.dateOfBirth',
    section: 'personal',
    positives: ['date of birth', 'birth date', 'dob', 'birthday'],
    kinds: ['date', 'text', 'month'],
    weight: 0.95,
  },
  {
    base: 'personal.nationality',
    section: 'personal',
    positives: ['nationality', 'citizenship', 'country of citizenship'],
    weight: 0.85,
  },
  {
    base: 'personal.rightToWorkUK',
    section: 'personal',
    positives: [
      'right to work',
      'authorised to work',
      'authorized to work',
      'legally able to work',
      'eligible to work in the uk',
    ],
    kinds: ['select', 'combobox', 'radiogroup', 'checkbox'],
    weight: 0.8,
  },
  {
    base: 'personal.needsVisaSponsorship',
    section: 'personal',
    positives: ['require sponsorship', 'need sponsorship', 'visa sponsorship', 'require visa'],
    kinds: ['select', 'combobox', 'radiogroup', 'checkbox'],
    weight: 0.8,
  },
  // -- Personal: address ----------------------------------------------------
  {
    base: 'personal.addressLine1',
    section: 'personal',
    positives: ['address line 1', 'street address', 'address 1', 'addr line 1'],
    negatives: ['line 2', 'email', 'website'],
    weight: 0.88,
  },
  {
    base: 'personal.addressLine2',
    section: 'personal',
    positives: ['address line 2', 'address 2', 'apartment', 'suite', 'unit'],
    weight: 0.88,
  },
  {
    base: 'personal.city',
    section: 'personal',
    positives: ['city', 'town', 'city town'],
    negatives: ['country'],
    weight: 0.82,
  },
  {
    base: 'personal.region',
    section: 'personal',
    positives: ['county', 'region', 'state', 'province', 'state province'],
    weight: 0.75,
  },
  {
    base: 'personal.postcode',
    section: 'personal',
    positives: ['postcode', 'post code', 'postal code', 'zip', 'zip code'],
    weight: 0.9,
  },
  {
    base: 'personal.country',
    section: 'personal',
    positives: ['country', 'country region'],
    negatives: ['county', 'code', 'citizenship'],
    kinds: ['select', 'combobox', 'text'],
    weight: 0.78,
  },
  // -- Personal: links ---------------------------------------------------
  {
    base: 'personal.linkedinUrl',
    section: 'personal',
    positives: ['linkedin', 'linked in', 'linkedin profile', 'linkedin url'],
    weight: 0.95,
  },
  {
    base: 'personal.githubUrl',
    section: 'personal',
    positives: ['github', 'git hub'],
    weight: 0.95,
  },
  {
    base: 'personal.portfolioUrl',
    section: 'personal',
    positives: ['portfolio', 'personal website', 'website', 'personal site', 'other url'],
    negatives: ['linkedin', 'github', 'company website'],
    weight: 0.7,
  },
  // -- Education ----------------------------------------------------------
  {
    base: 'institution',
    section: 'education',
    positives: ['school', 'university', 'college', 'institution', 'school name'],
    negatives: ['high school only', 'employer'],
    weight: 0.85,
  },
  {
    base: 'qualificationType',
    section: 'education',
    positives: ['degree', 'degree type', 'qualification', 'level of education', 'diploma'],
    negatives: ['field', 'subject', 'discipline'],
    kinds: ['select', 'combobox', 'text'],
    weight: 0.8,
  },
  {
    base: 'fieldOfStudy',
    section: 'education',
    positives: ['field of study', 'major', 'discipline', 'subject', 'course', 'programme', 'program'],
    weight: 0.82,
  },
  {
    base: 'gradeValue',
    section: 'education',
    positives: ['grade', 'gpa', 'result', 'classification', 'overall grade', 'final grade', 'achievement', 'honours', 'honors'],
    weight: 0.78,
  },
  {
    base: 'startDate',
    section: 'education',
    positives: ['start date', 'from', 'start year', 'attended from', 'date from'],
    negatives: ['end', 'to', 'graduation'],
    kinds: ['date', 'month', 'text', 'select', 'number'],
    weight: 0.6,
  },
  {
    base: 'endDate',
    section: 'education',
    positives: ['end date', 'to', 'graduation date', 'completion date', 'end year', 'date to'],
    negatives: ['start', 'from'],
    kinds: ['date', 'month', 'text', 'select', 'number'],
    weight: 0.6,
  },
  // -- Experience ------------------------------------------------------------
  {
    base: 'jobTitle',
    section: 'experience',
    positives: ['job title', 'title', 'position', 'role', 'your title'],
    negatives: ['company', 'employer', 'mr mrs', 'salutation'],
    weight: 0.8,
  },
  {
    base: 'employer',
    section: 'experience',
    positives: ['company', 'employer', 'company name', 'organisation', 'organization', 'employer name'],
    negatives: ['school', 'university', 'website', 'email'],
    weight: 0.82,
  },
  {
    base: 'location',
    section: 'experience',
    positives: ['company location', 'job location', 'work location', 'location of employment'],
    weight: 0.6,
  },
  {
    base: 'startDate',
    section: 'experience',
    positives: ['start date', 'from', 'employed from', 'worked from', 'date started'],
    negatives: ['end', 'to'],
    kinds: ['date', 'month', 'text', 'select', 'number'],
    weight: 0.62,
  },
  {
    base: 'endDate',
    section: 'experience',
    positives: ['end date', 'to', 'employed until', 'worked to', 'date ended', 'leaving date'],
    negatives: ['start', 'from'],
    kinds: ['date', 'month', 'text', 'select', 'number'],
    weight: 0.62,
  },
  {
    base: 'current',
    section: 'experience',
    positives: ['currently work here', 'current role', 'i currently work', 'present', 'current employer', 'this is my current'],
    kinds: ['checkbox', 'radio', 'radiogroup'],
    weight: 0.8,
  },
  {
    base: 'description',
    section: 'experience',
    positives: ['responsibilities', 'description', 'duties', 'summary of role', 'what did you do', 'achievements'],
    kinds: ['textarea'],
    weight: 0.7,
  },
];
