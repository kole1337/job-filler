import {
  profileSchema,
  tokenResponseSchema,
  type Credentials,
  type Profile,
} from '@job-filler/shared';
import { getAuth, getSettings, setAuth, setCachedProfile, type AuthState } from './storage';

async function portal(path: string): Promise<string> {
  const { portalUrl } = await getSettings();
  return `${portalUrl.replace(/\/$/, '')}${path}`;
}

export async function login(creds: Credentials): Promise<AuthState> {
  const res = await fetch(await portal('/api/auth/token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Login failed (${res.status})`);
  }
  const parsed = tokenResponseSchema.parse(await res.json());
  const state: AuthState = {
    accessToken: parsed.accessToken,
    accessTokenExp: Date.now() + parsed.expiresIn * 1000,
    refreshToken: parsed.refreshToken,
    email: parsed.user.email,
    userId: parsed.user.id,
  };
  await setAuth(state);
  return state;
}

async function refresh(current: AuthState): Promise<AuthState | null> {
  const res = await fetch(await portal('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  if (!res.ok) {
    await setAuth(null);
    return null;
  }
  const parsed = tokenResponseSchema.parse(await res.json());
  const state: AuthState = {
    accessToken: parsed.accessToken,
    accessTokenExp: Date.now() + parsed.expiresIn * 1000,
    refreshToken: parsed.refreshToken,
    email: parsed.user.email,
    userId: parsed.user.id,
  };
  await setAuth(state);
  return state;
}

/** Get a valid access token, refreshing if it expires within 60s. */
export async function validAccessToken(): Promise<string | null> {
  let auth = await getAuth();
  if (!auth) return null;
  if (auth.accessTokenExp - Date.now() < 60_000) {
    auth = await refresh(auth);
  }
  return auth?.accessToken ?? null;
}

export async function logout(): Promise<void> {
  const auth = await getAuth();
  if (auth) {
    await fetch(await portal('/api/auth/logout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    }).catch(() => {});
  }
  await setAuth(null);
}

export async function fetchProfile(): Promise<Profile> {
  const token = await validAccessToken();
  if (!token) throw new Error('Not logged in');
  const res = await fetch(await portal('/api/profile'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    await setAuth(null);
    throw new Error('Session expired — log in again');
  }
  if (!res.ok) throw new Error(`Could not load profile (${res.status})`);
  const profile = profileSchema.parse(await res.json());
  await setCachedProfile(profile);
  return profile;
}
