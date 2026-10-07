export * from './profile';

/** Profile keys the ATS layer can target. Keep in sync with `profileSchema`. */
export type ProfileFieldKey =
  | `personal.${
      | 'firstName'
      | 'middleName'
      | 'lastName'
      | 'preferredName'
      | 'fullName'
      | 'dateOfBirth'
      | 'email'
      | 'phone'
      | 'addressLine1'
      | 'addressLine2'
      | 'city'
      | 'region'
      | 'postcode'
      | 'country'
      | 'nationality'
      | 'rightToWorkUK'
      | 'needsVisaSponsorship'
      | 'linkedinUrl'
      | 'portfolioUrl'
      | 'githubUrl'}`
  | `education[].${'institution' | 'qualificationType' | 'fieldOfStudy' | 'gradeValue' | 'startDate' | 'endDate' | 'current'}`
  | `experience[].${'jobTitle' | 'employer' | 'location' | 'startDate' | 'endDate' | 'current' | 'description'}`
  | `custom.${string}`;
