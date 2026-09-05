import type { Profile } from '@job-filler/shared';
import {
  planFill,
  findByRef,
  fillControl,
  markForReview,
  clearReviewMark,
  extractFields,
  contextFromLocation,
  detectAdapter,
} from '@job-filler/ats';
import { toSerializable, unmatchedToSerializable, type PlanResult } from '@/src/lib/messages';

export default defineContentScript({
  matches: [
    '*://*.myworkdayjobs.com/*',
    '*://*.myworkdaysite.com/*',
    '*://boards.greenhouse.io/*',
    '*://job-boards.greenhouse.io/*',
    '*://*.greenhouse.io/*',
    '*://jobs.lever.co/*',
    '*://jobs.ashbyhq.com/*',
  ],
  allFrames: true,
  runAt: 'document_idle',

  main() {
    async function getProfile(): Promise<Profile> {
      const res = await chrome.runtime.sendMessage({ type: 'GET_PROFILE' });
      if (res?.error || !res?.profile) throw new Error(res?.error ?? 'No profile — log in via the popup');
      return res.profile as Profile;
    }

    // Cache the last plan so APPLY_FILL can reuse the resolved matches.
    let lastPlan: ReturnType<typeof planFill> | null = null;

    chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
      (async (): Promise<PlanResult | { ok: true; filled: number; failed: string[] }> => {
        if (msg?.type === 'PLAN_FILL') {
          const profile = await getProfile();
          const plan = planFill(document, location.href, profile, { minConfidence: msg.minConfidence ?? 0.7 });
          lastPlan = plan;
          // outline the review items so the user can see them on the page
          plan.review.forEach((m) => {
            const el = findByRef(document, m.descriptor.ref);
            if (el) markForReview(el, m.reason);
          });
          return {
            atsId: plan.atsId,
            steps: plan.steps,
            notes: plan.notes,
            quirks: plan.quirks,
            autofill: plan.autofill.map(toSerializable),
            review: plan.review.map(toSerializable),
            unmatched: plan.unmatched.map(unmatchedToSerializable),
          };
        }

        if (msg?.type === 'APPLY_FILL') {
          if (!lastPlan) throw new Error('Run "Plan" first');
          const refs: string[] = msg.refs;
          const chosen = [...lastPlan.autofill, ...lastPlan.review].filter((m) =>
            refs.includes(m.descriptor.ref),
          );
          const failed: string[] = [];
          let filled = 0;
          for (const m of chosen) {
            const el = findByRef(document, m.descriptor.ref);
            if (!el) {
              failed.push(m.descriptor.label ?? m.descriptor.ref);
              continue;
            }
            const outcome = await fillControl(el, m.value, m.descriptor.kind);
            if (outcome.ok) {
              clearReviewMark(el);
              filled++;
            } else {
              markForReview(el, outcome.note ?? 'could not fill automatically');
              failed.push(`${m.descriptor.label ?? m.descriptor.ref}: ${outcome.note ?? 'failed'}`);
            }
          }
          return { ok: true, filled, failed };
        }

        if (msg?.type === 'DETECT') {
          const ctx = contextFromLocation(location.href, document);
          const adapter = detectAdapter(ctx);
          return {
            atsId: adapter.id,
            fieldCount: extractFields(document).length,
            steps: adapter.getStepPlan().steps,
            notes: adapter.getStepPlan().notes ?? [],
            quirks: adapter.quirks,
            autofill: [],
            review: [],
            unmatched: [],
          } as PlanResult;
        }

        throw new Error(`unknown message ${msg?.type}`);
      })()
        .then(sendResponse)
        .catch((e) => sendResponse({ error: String(e?.message ?? e) }));
      return true;
    });
  },
});
