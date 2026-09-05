import 'server-only';
import {
  emptyProfile,
  profileDraftSchema,
  profileInputSchema,
  type Profile,
  type ProfileInput,
} from '@job-filler/shared';
import { prisma } from './db';
import { decrypt, encrypt } from './crypto';

/** Load the full profile bundle for a user, decrypting sensitive columns. */
export async function getProfile(userId: string): Promise<Profile> {
  const [p, education, experience, custom, user] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.education.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
    prisma.experience.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
    prisma.customAnswer.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);

  const base = emptyProfile(user?.email ?? '');
  if (!p) return base;

  return {
    personal: {
      firstName: p.firstName,
      middleName: p.middleName ?? undefined,
      lastName: p.lastName,
      preferredName: p.preferredName ?? undefined,
      dateOfBirth: decrypt(p.dateOfBirthEnc) ?? undefined,
      email: p.email || (user?.email ?? ''),
      phone: decrypt(p.phoneEnc) ?? undefined,
      phoneCountry: p.phoneCountry ?? undefined,
      addressLine1: decrypt(p.addressLine1Enc) ?? undefined,
      addressLine2: decrypt(p.addressLine2Enc) ?? undefined,
      city: p.city ?? undefined,
      region: p.region ?? undefined,
      postcode: p.postcode ?? undefined,
      country: p.country || 'GB',
      nationality: decrypt(p.nationalityEnc) ?? undefined,
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
      value: decrypt(c.valueEnc) ?? '',
      matchHints: c.matchHints,
      sensitive: c.sensitive,
    })),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Replace the whole profile bundle in one transaction (strict = complete profile). */
export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
  return persist(userId, profileInputSchema.parse(input));
}

/** Autosave path — accepts partial data from the dashboard as the user types. */
export async function saveProfileDraft(userId: string, input: unknown): Promise<Profile> {
  return persist(userId, profileDraftSchema.parse(input) as ProfileInput);
}

async function persist(userId: string, data: ProfileInput): Promise<Profile> {
  const pd = data.personal;

  await prisma.$transaction([
    prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: pd.firstName,
        middleName: pd.middleName,
        lastName: pd.lastName,
        preferredName: pd.preferredName,
        dateOfBirthEnc: encrypt(pd.dateOfBirth),
        email: pd.email,
        phoneEnc: encrypt(pd.phone),
        phoneCountry: pd.phoneCountry,
        addressLine1Enc: encrypt(pd.addressLine1),
        addressLine2Enc: encrypt(pd.addressLine2),
        city: pd.city,
        region: pd.region,
        postcode: pd.postcode,
        country: pd.country,
        nationalityEnc: encrypt(pd.nationality),
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
        dateOfBirthEnc: encrypt(pd.dateOfBirth),
        email: pd.email,
        phoneEnc: encrypt(pd.phone),
        phoneCountry: pd.phoneCountry ?? null,
        addressLine1Enc: encrypt(pd.addressLine1),
        addressLine2Enc: encrypt(pd.addressLine2),
        city: pd.city ?? null,
        region: pd.region ?? null,
        postcode: pd.postcode ?? null,
        country: pd.country,
        nationalityEnc: encrypt(pd.nationality),
        rightToWorkUK: pd.rightToWorkUK ?? null,
        needsVisaSponsorship: pd.needsVisaSponsorship ?? null,
        linkedinUrl: pd.linkedinUrl ?? null,
        portfolioUrl: pd.portfolioUrl ?? null,
        githubUrl: pd.githubUrl ?? null,
      },
    }),
    prisma.education.deleteMany({ where: { userId } }),
    prisma.experience.deleteMany({ where: { userId } }),
    prisma.customAnswer.deleteMany({ where: { userId } }),
    prisma.education.createMany({
      data: data.education.map((e, i) => ({
        userId,
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
        userId,
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
        userId,
        key: c.key,
        label: c.label,
        valueEnc: encrypt(c.value) ?? '',
        matchHints: c.matchHints,
        sensitive: c.sensitive,
      })),
    }),
  ]);

  return getProfile(userId);
}
