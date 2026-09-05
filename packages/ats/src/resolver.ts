import type {
  Adapter,
  AdapterContext,
  FieldDescriptor,
  FieldMatch,
  ResolveResult,
  TargetKey,
  UnmatchedField,
} from './types';
import { KEYWORD_RULES } from './keywords';
import { containsPhrase, fieldHaystack } from './normalize';
import { matchOption } from './options';

export interface ResolveOptions {
  /** Matches at/above this confidence are auto-filled; below are sent to review. */
  minConfidence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.7;

interface ResolverGuess {
  base: string;
  section: 'personal' | 'education' | 'experience';
  score: number;
  reason: string;
}

function scoreWithKeywords(d: FieldDescriptor): ResolverGuess | null {
  const hay = fieldHaystack(d);
  if (!hay) return null;
  let best: ResolverGuess | null = null;

  for (const rule of KEYWORD_RULES) {
    if (rule.kinds && rule.kinds.length && !rule.kinds.includes(d.kind)) continue;
    if (rule.negatives?.some((n) => containsPhrase(hay, n))) continue;
    const hit = rule.positives.find((p) => containsPhrase(hay, p));
    if (!hit) continue;

    // Prefer a match on the visible label over one that only hit `name`/`id`.
    const onLabel = containsPhrase(fieldHaystack({ label: d.label, ariaLabel: d.ariaLabel }), hit);
    const score = Math.min(1, rule.weight + (onLabel ? 0.05 : 0) - (hit.length <= 2 ? 0.1 : 0));

    if (!best || score > best.score) {
      best = { base: rule.base, section: rule.section, score, reason: `matched "${hit}"` };
    }
  }
  return best;
}

function targetForGuess(g: ResolverGuess, d: FieldDescriptor): TargetKey {
  if (g.section === 'personal') return g.base as TargetKey;
  const idx = d.sectionIndex ?? 0;
  return `${g.section}.${idx}.${g.base}` as TargetKey;
}

/** Resolve every descriptor against the adapter playbook + keyword resolver. */
export function resolveFields(
  descriptors: FieldDescriptor[],
  flatProfile: Record<string, string>,
  adapter: Adapter,
  ctx: AdapterContext,
  opts: ResolveOptions = {},
): ResolveResult {
  const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const autofill: FieldMatch[] = [];
  const review: FieldMatch[] = [];
  const unmatched: UnmatchedField[] = [];

  for (const d of descriptors) {
    if (d.kind === 'file') continue; // resume upload handled separately

    const playbook = adapter.resolveField(d, ctx);
    const guess = scoreWithKeywords(d);
    const resolverTarget = guess ? targetForGuess(guess, d) : null;

    let target: TargetKey | null = null;
    let confidence = 0;
    let reason = '';
    let source: FieldMatch['source'] = 'resolver';
    let disagreement = false;

    if (playbook && resolverTarget) {
      if (playbook.target === resolverTarget) {
        target = playbook.target;
        confidence = Math.min(1, Math.max(playbook.confidence, guess!.score) + 0.1);
        reason = `playbook (${playbook.reason}) + resolver (${guess!.reason})`;
        source = 'playbook+resolver';
      } else {
        // Trust the playbook target but flag for review because signals conflict.
        target = playbook.target;
        confidence = Math.min(playbook.confidence, 0.55);
        reason = `playbook says ${playbook.target}, resolver says ${resolverTarget} — confirm`;
        source = 'playbook';
        disagreement = true;
      }
    } else if (playbook) {
      target = playbook.target;
      confidence = playbook.confidence;
      reason = `playbook (${playbook.reason})`;
      source = 'playbook';
    } else if (resolverTarget) {
      target = resolverTarget;
      confidence = guess!.score;
      reason = `resolver (${guess!.reason})`;
      source = 'resolver';
    }

    if (!target) {
      if (d.required) {
        unmatched.push({ descriptor: d, reason: 'no confident mapping for a required field' });
      }
      continue;
    }

    const rawValue = flatProfile[target] ?? '';
    if (!rawValue) {
      if (d.required) {
        unmatched.push({
          descriptor: d,
          suggestion: target,
          reason: `mapped to ${target} but your profile has no value for it`,
        });
      }
      continue;
    }

    // For choice controls, translate the profile value to an actual option.
    let value = rawValue;
    if ((d.kind === 'select' || d.kind === 'combobox' || d.kind === 'radiogroup') && d.options?.length) {
      const opt = matchOption(rawValue, d.options, target);
      if (!opt) {
        review.push({
          descriptor: d,
          target,
          confidence: Math.min(confidence, 0.5),
          value: rawValue,
          reason: `${reason}; no matching option for "${rawValue}"`,
          source,
        });
        continue;
      }
      value = opt.value;
    }

    const match: FieldMatch = { descriptor: d, target, confidence, value, reason, source };
    if (!disagreement && confidence >= minConfidence) autofill.push(match);
    else review.push(match);
  }

  return { atsId: adapter.id, autofill, review, unmatched };
}
