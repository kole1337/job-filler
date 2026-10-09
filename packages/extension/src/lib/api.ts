import { savedProfileSchema, type Profile } from '@job-filler/shared';
import { getSettings, setCachedProfile } from './storage';

async function portal(path: string): Promise<string> {
  const { portalUrl } = await getSettings();
  return `${portalUrl.replace(/\/$/, '')}${path}`;
}

/** The portal runs locally with no login — just fetch the profile. */
export async function fetchProfile(): Promise<Profile> {
  const res = await fetch(await portal('/api/profile')).catch(() => null);
  if (!res) {
    const { portalUrl } = await getSettings();
    throw new Error(`Can't reach the portal at ${portalUrl} — is it running?`);
  }
  if (!res.ok) throw new Error(`Could not load profile (${res.status})`);
  const parsed = savedProfileSchema.safeParse(await res.json());
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`The portal sent a profile the extension can't read (${issue?.path.join('.')}: ${issue?.message})`);
  }
  const profile = parsed.data;
  await setCachedProfile(profile);
  return profile;
}
