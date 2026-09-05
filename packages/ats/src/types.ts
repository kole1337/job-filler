import type { Profile } from '@job-filler/shared';

export type AtsId = 'workday' | 'greenhouse' | 'lever' | 'ashby' | 'generic';

/** The kind of control we are filling — determines the fill strategy. */
export type ControlKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'date'
  | 'month'
  | 'number'
  | 'select' // native <select>
  | 'combobox' // react-select / Workday listbox / custom autocomplete
  | 'checkbox'
  | 'radio'
  | 'radiogroup'
  | 'file'
  | 'unknown';

/**
 * A framework-agnostic description of one form control, extracted from the DOM
 * by the extension. Kept serialisable so it can cross the content-script boundary
 * and be unit-tested without a real DOM.
 */
export interface FieldDescriptor {
  /** Stable-ish handle the extension uses to find the element again. */
  ref: string;
  kind: ControlKind;
  /** Visible <label> text. */
  label?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  autocomplete?: string;
  required?: boolean;
  /** Text of the nearest section heading / <legend> / fieldset. */
  groupLabel?: string;
  /** For select / radiogroup: the choices. */
  options?: Array<{ value: string; label: string }>;
  /** ATS-specific hooks, e.g. Workday's data-automation-id. */
  attrs?: Record<string, string>;
  /** Index of the repeating section this belongs to (0-based), if any. */
  sectionIndex?: number;
}

/** Canonical target within the profile that a field maps to. */
export type TargetKey =
  | `personal.${string}`
  | `education.${number}.${string}`
  | `experience.${number}.${string}`
  | `custom.${string}`;

export interface FieldMatch {
  descriptor: FieldDescriptor;
  target: TargetKey;
  /** 0..1 — how sure we are. Below `minConfidence` the field is only *suggested*. */
  confidence: number;
  /** The value we would put in, already stringified for the control. */
  value: string;
  /** Why this match was made — shown in the extension review list. */
  reason: string;
  source: 'playbook' | 'resolver' | 'playbook+resolver';
}

export interface UnmatchedField {
  descriptor: FieldDescriptor;
  /** Best guess target, if any — user can confirm in the review list. */
  suggestion?: TargetKey;
  reason: string;
}

export interface ResolveResult {
  atsId: AtsId;
  /** Fields safe to auto-fill (confidence >= threshold or playbook-confirmed). */
  autofill: FieldMatch[];
  /** Fields shown for manual confirmation before filling. */
  review: FieldMatch[];
  /** Required fields we could not map at all. */
  unmatched: UnmatchedField[];
}

export interface StepPlan {
  /** Ordered list of step names this ATS walks through. */
  steps: string[];
  /** Human-readable notes shown in the extension for this ATS. */
  notes?: string[];
  /** Whether the whole application is on a single page. */
  singlePage: boolean;
}

export interface AdapterContext {
  url: string;
  hostname: string;
  /** Present in the content script; absent in unit tests. */
  document?: Document;
}

export interface Adapter {
  id: AtsId;
  /** Cheap URL/DOM signature check. */
  matches(ctx: AdapterContext): boolean;
  getStepPlan(): StepPlan;
  /**
   * Deterministic selector -> target mapping known to be stable for this ATS.
   * Returned matches are trusted (source: 'playbook') even at lower text confidence.
   * `resolveField` receives the descriptor and returns a target + base confidence,
   * or null if the playbook has nothing to say.
   */
  resolveField(descriptor: FieldDescriptor, ctx: AdapterContext): { target: TargetKey; confidence: number; reason: string } | null;
  /** ATS-specific quirks worth surfacing to the user. */
  quirks: string[];
}

export type FlatProfile = ReturnType<typeof import('./flatten').flattenProfile>;
export type { Profile };
