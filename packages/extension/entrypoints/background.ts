import { credentialsSchema } from '@job-filler/shared';
import { fetchProfile, login, logout } from '@/src/lib/api';
import { getAuth, getCachedProfile } from '@/src/lib/storage';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      switch (msg?.type) {
        case 'AUTH_STATUS': {
          const auth = await getAuth();
          const cache = await getCachedProfile();
          return { loggedIn: !!auth, email: auth?.email, profileFetchedAt: cache?.fetchedAt };
        }
        case 'LOGIN': {
          const creds = credentialsSchema.parse({ email: msg.email, password: msg.password });
          const state = await login(creds);
          await fetchProfile().catch(() => {});
          return { ok: true, email: state.email };
        }
        case 'LOGOUT':
          await logout();
          return { ok: true };
        case 'SYNC_PROFILE': {
          const profile = await fetchProfile();
          return { ok: true, fetchedAt: Date.now(), education: profile.education.length, experience: profile.experience.length };
        }
        case 'GET_PROFILE': {
          const cache = await getCachedProfile();
          if (cache) return { profile: cache.profile };
          const profile = await fetchProfile();
          return { profile };
        }
        default:
          return { error: `unknown message ${msg?.type}` };
      }
    })()
      .then(sendResponse)
      .catch((e) => sendResponse({ error: String(e?.message ?? e) }));
    return true; // async response
  });

  // Periodically refresh the cached profile while logged in.
  browser.alarms.create('sync', { periodInMinutes: 180 });
  browser.alarms.onAlarm.addListener((a) => {
    if (a.name === 'sync') fetchProfile().catch(() => {});
  });
});
