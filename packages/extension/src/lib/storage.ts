import type { Profile } from '@job-filler/shared';

/**
 * browser.storage.local wrapper (WXT's promise-based polyfill — works on Chrome
 * and Firefox alike; the raw `chrome.*` API is callback-style on Firefox).
 * There's no login, so there's nothing secret in here — just settings and a
 * cached copy of the profile fetched from the local portal.
 */
export interface Settings {
  portalUrl: string;
  minConfidence: number;
  alwaysReview: boolean;
}

export interface CachedProfile {
  profile: Profile;
  fetchedAt: number;
}

const DEFAULT_SETTINGS: Settings = {
  portalUrl: (globalThis as { __PORTAL_URL__?: string }).__PORTAL_URL__ ?? 'http://localhost:3000',
  minConfidence: 0.7,
  alwaysReview: true,
};

export async function getSettings(): Promise<Settings> {
  const { settings } = await browser.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings> | undefined) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await browser.storage.local.set({ settings: next });
  return next;
}

export async function getCachedProfile(): Promise<CachedProfile | null> {
  const { profileCache } = await browser.storage.local.get('profileCache');
  return (profileCache as CachedProfile | undefined) ?? null;
}

export async function setCachedProfile(profile: Profile): Promise<void> {
  await browser.storage.local.set({ profileCache: { profile, fetchedAt: Date.now() } });
}

export async function clearAll(): Promise<void> {
  await browser.storage.local.remove('profileCache');
}
