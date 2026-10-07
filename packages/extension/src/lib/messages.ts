import type { FieldMatch, UnmatchedField } from '@job-filler/ats';

/** Popup/content <-> background message protocol. */
export type Message =
  | { type: 'SYNC_PROFILE' }
  | { type: 'GET_PROFILE' }
  | { type: 'PLAN_FILL'; tabId: number }
  | { type: 'APPLY_FILL'; tabId: number; refs: string[] };

export interface ProfileStatus {
  ok: boolean;
  profileFetchedAt?: number;
  error?: string;
}

export interface PlanResult {
  atsId: string;
  steps: string[];
  notes: string[];
  quirks: string[];
  autofill: SerializableMatch[];
  review: SerializableMatch[];
  unmatched: Array<{ label: string; reason: string }>;
  error?: string;
}

export interface SerializableMatch {
  ref: string;
  label: string;
  target: string;
  value: string;
  confidence: number;
  reason: string;
}

export function toSerializable(m: FieldMatch): SerializableMatch {
  return {
    ref: m.descriptor.ref,
    label: m.descriptor.label ?? m.descriptor.ariaLabel ?? m.descriptor.name ?? '(unlabelled)',
    target: m.target,
    value: m.value,
    confidence: Math.round(m.confidence * 100) / 100,
    reason: m.reason,
  };
}

export function unmatchedToSerializable(u: UnmatchedField) {
  return {
    label: u.descriptor.label ?? u.descriptor.ariaLabel ?? u.descriptor.name ?? '(unlabelled)',
    reason: u.reason,
  };
}
