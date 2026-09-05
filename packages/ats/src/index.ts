export * from './types';
export * from './flatten';
export * from './resolver';
export * from './detect';
export * from './normalize';
export * from './options';
export * from './dom-extract';
export * from './dom-fill';
export { KEYWORD_RULES } from './keywords';

export { workdayAdapter } from './adapters/workday';
export { greenhouseAdapter } from './adapters/greenhouse';
export { leverAdapter } from './adapters/lever';
export { ashbyAdapter } from './adapters/ashby';
export { genericAdapter } from './adapters/generic';

import type { Profile } from '@job-filler/shared';
import { contextFromLocation, detectAdapter } from './detect';
import { flattenProfile } from './flatten';
import { extractFields, type ExtractOptions } from './dom-extract';
import { resolveFields, type ResolveOptions } from './resolver';
import type { ResolveResult } from './types';

/**
 * One-shot: look at the current page, work out the ATS, extract its fields and
 * resolve them against the profile. Pure planning — no DOM writes happen here.
 */
export function planFill(
  doc: Document,
  url: string,
  profile: Profile,
  opts: ResolveOptions & ExtractOptions = {},
): ResolveResult & { steps: string[]; quirks: string[]; notes: string[] } {
  const ctx = contextFromLocation(url, doc);
  const adapter = detectAdapter(ctx);
  const fields = extractFields(doc, { root: opts.root });
  const flat = flattenProfile(profile);
  const result = resolveFields(fields, flat, adapter, ctx, { minConfidence: opts.minConfidence });
  const plan = adapter.getStepPlan();
  return { ...result, steps: plan.steps, notes: plan.notes ?? [], quirks: adapter.quirks };
}
