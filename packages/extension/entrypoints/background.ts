import type { Message } from '@/src/lib/messages';
import { fetchProfile } from '@/src/lib/api';
import { getCachedProfile } from '@/src/lib/storage';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((raw: any, _sender, sendResponse) => {
    const msg = raw as Message;
    (async () => {
      switch (msg?.type) {
        case 'SYNC_PROFILE': {
          const profile = await fetchProfile();
          return { ok: true, fetchedAt: Date.now(), education: profile.education.length, experience: profile.experience.length };
        }
        case 'GET_PROFILE': {
          const cache = await getCachedProfile();
          if (cache) return { profile: cache.profile, fetchedAt: cache.fetchedAt };
          const profile = await fetchProfile();
          return { profile, fetchedAt: Date.now() };
        }
        default:
          return { error: `unknown message ${msg?.type}` };
      }
    })()
      .then(sendResponse)
      .catch((e) => sendResponse({ error: String(e?.message ?? e) }));
    return true; // async response
  });

  // Periodically refresh the cached profile from the local portal.
  browser.alarms.create('sync', { periodInMinutes: 180 });
  browser.alarms.onAlarm.addListener((a) => {
    if (a.name === 'sync') fetchProfile().catch(() => {});
  });
});
