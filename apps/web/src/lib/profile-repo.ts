import {
  emptyProfile,
  profileDraftSchema,
  profileInputSchema,
  type Profile,
  type ProfileInput,
} from '@job-filler/shared';
import { prisma } from './db';

/** There is exactly one profile in a local install — always row id 1. */
const PROFILE_ID = 1;

/** Load the full profile bundle. */
export async function getProfile(): Promise<Profile> {
  const [p, education, experience, custom] = await Promise.all([
    prisma.profile.findUnique({ where: { id: PROFILE_ID } }),
    prisma.education.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.experience.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.customAnswer.findMany(),
  ]);

  if (!p) return emptyProfile();

  return {
    personal: {
      firstName: p.firstName,
      middleName: p.middleName ?? undefined,
      lastName: p.lastName,
      preferredName: p.preferredName ?? undefined,
      dateOfBirth: p.dateOfBirth ?? undefined,
      email: p.email,
      phone: p.phone ?? undefined,
      phoneCountry: p.phoneCountry ?? undefined,
      addressLine1: p.addressLine1 ?? undefined,
      addressLine2: p.addressLine2 ?? undefined,
      city: p.city ?? undefined,
      region: p.region ?? undefined,
      postcode: p.postcode ?? undefined,
      country: p.country || 'GB',
      nationality: p.nationality ?? undefined,
      rightToWorkUK: p.rightToWorkUK ?? undefined,
      needsVisaSponsorship: p.needsVisaSponsorship ?? undefined,
      linkedinUrl: p.linkedinUrl ?? undefined,
      portfolioUrl: p.portfolioUrl ?? undefined,
      githubUrl: p.githubUrl ?? undefined,
    },
    education: education.map((e) => ({
      id: e.id,
      institution: e.institution,
      qualificationType: e.qualificationType as Profile['education'][number]['qualificationType'],
      fieldOfStudy: e.fieldOfStudy ?? undefined,
      gradeType: e.gradeType as Profile['education'][number]['gradeType'],
      gradeValue: e.gradeValue ?? undefined,
      startDate: e.startDate ?? undefined,
      endDate: e.endDate ?? undefined,
      current: e.current,
      description: e.description ?? undefined,
    })),
    experience: experience.map((e) => ({
      id: e.id,
      jobTitle: e.jobTitle,
      employer: e.employer,
      location: e.location ?? undefined,
      employmentType: (e.employmentType as Profile['experience'][number]['employmentType']) ?? undefined,
      startDate: e.startDate,
      endDate: e.endDate ?? undefined,
      current: e.current,
      description: e.description ?? undefined,
    })),
    customAnswers: custom.map((c) => ({
      id: c.id,
      key: c.key,
      label: c.label,
      value: c.value,
      matchHints: parseMatchHints(c.matchHints),
      sensitive: c.sensitive,
    })),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Replace the whole profile bundle in one transaction (strict = complete profile). */
export async function saveProfile(input: ProfileInput): Promise<Profile> {
  return persist(profileInputSchema.parse(input));
}

/** Autosave path — accepts partial data from the dashboard as the user types. */
export async function saveProfileDraft(input: unknown): Promise<Profile> {
  return persist(profileDraftSchema.parse(input) as ProfileInput);
}

/** Wipe the profile and all related rows — used by the "clear local data" action. */
export async function clearProfile(): Promise<void> {
  await prisma.$transaction([
    prisma.education.deleteMany(),
    prisma.experience.deleteMany(),
    prisma.customAnswer.deleteMany(),
    prisma.profile.deleteMany({ where: { id: PROFILE_ID } }),
  ]);
}

function parseMatchHints(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function persist(data: ProfileInput): Promise<Profile> {
  const pd = data.personal;

  await prisma.$transaction([
    prisma.profile.upsert({
      where: { id: PROFILE_ID },
      create: {
        id: PROFILE_ID,
        firstName: pd.firstName,
        middleName: pd.middleName,
        lastName: pd.lastName,
        preferredName: pd.preferredName,
        dateOfBirth: pd.dateOfBirth,
        email: pd.email,
        phone: pd.phone,
        phoneCountry: pd.phoneCountry,
        addressLine1: pd.addressLine1,
        addressLine2: pd.addressLine2,
        city: pd.city,
        region: pd.region,
        postcode: pd.postcode,
        country: pd.country,
        nationality: pd.nationality,
        rightToWorkUK: pd.rightToWorkUK,
        needsVisaSponsorship: pd.needsVisaSponsorship,
        linkedinUrl: pd.linkedinUrl,
        portfolioUrl: pd.portfolioUrl,
        githubUrl: pd.githubUrl,
      },
      update: {
        firstName: pd.firstName,
        middleName: pd.middleName ?? null,
        lastName: pd.lastName,
        preferredName: pd.preferredName ?? null,
        dateOfBirth: pd.dateOfBirth ?? null,
        email: pd.email,
        phone: pd.phone ?? null,
        phoneCountry: pd.phoneCountry ?? null,
        addressLine1: pd.addressLine1 ?? null,
        addressLine2: pd.addressLine2 ?? null,
        city: pd.city ?? null,
        region: pd.region ?? null,
        postcode: pd.postcode ?? null,
        country: pd.country,
        nationality: pd.nationality ?? null,
        rightToWorkUK: pd.rightToWorkUK ?? null,
        needsVisaSponsorship: pd.needsVisaSponsorship ?? null,
        linkedinUrl: pd.linkedinUrl ?? null,
        portfolioUrl: pd.portfolioUrl ?? null,
        githubUrl: pd.githubUrl ?? null,
      },
    }),
    prisma.education.deleteMany(),
    prisma.experience.deleteMany(),
    prisma.customAnswer.deleteMany(),
    prisma.education.createMany({
      data: data.education.map((e, i) => ({
        sortOrder: i,
        institution: e.institution,
        qualificationType: e.qualificationType,
        fieldOfStudy: e.fieldOfStudy,
        gradeType: e.gradeType,
        gradeValue: e.gradeValue,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current,
        description: e.description,
      })),
    }),
    prisma.experience.createMany({
      data: data.experience.map((e, i) => ({
        sortOrder: i,
        jobTitle: e.jobTitle,
        employer: e.employer,
        location: e.location,
        employmentType: e.employmentType,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current,
        description: e.description,
      })),
    }),
    prisma.customAnswer.createMany({
      data: data.customAnswers.map((c) => ({
        key: c.key,
        label: c.label,
        value: c.value,
        matchHints: JSON.stringify(c.matchHints),
        sensitive: c.sensitive,
      })),
    }),
  ]);

  return getProfile();
}
