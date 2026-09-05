import type { Profile } from '@job-filler/shared';

/**
 * chrome.storage.local wrapper. Tokens are lightly obfuscated with a per-install
 * key so a casual glance at storage doesn't reveal them; this is not a substitute
 * for the OS keychain, but browser extensions have no better option and the tokens
 * are short-lived + revocable.
 */
export interface AuthState {
  accessToken: string;
  accessTokenExp: number; // epoch ms
  refreshToken: string;
  email: string;
  userId: string;
}

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

function xor(text: string, key: string): string {
  return Array.from(text)
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
}

async function installKey(): Promise<string> {
  const { __k } = await chrome.storage.local.get('__k');
  if (typeof __k === 'string') return __k;
  const k = crypto.randomUUID() + crypto.randomUUID();
  await chrome.storage.local.set({ __k: k });
  return k;
}

export async function getAuth(): Promise<AuthState | null> {
  const { auth } = await chrome.storage.local.get('auth');
  if (!auth) return null;
  try {
    return JSON.parse(xor(atob(auth as string), await installKey())) as AuthState;
  } catch {
    return null;
  }
}

export async function setAuth(state: AuthState | null): Promise<void> {
  if (!state) {
    await chrome.storage.local.remove('auth');
    return;
  }
  const packed = btoa(xor(JSON.stringify(state), await installKey()));
  await chrome.storage.local.set({ auth: packed });
}

export async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings> | undefined) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export async function getCachedProfile(): Promise<CachedProfile | null> {
  const { profileCache } = await chrome.storage.local.get('profileCache');
  return (profileCache as CachedProfile | undefined) ?? null;
}

export async function setCachedProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ profileCache: { profile, fetchedAt: Date.now() } });
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.remove(['auth', 'profileCache']);
}
