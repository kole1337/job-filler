import { normalize } from './normalize';

type Opt = { value: string; label: string };

/** Yes/no style synonyms for boolean-ish profile values. */
const YES = ['yes', 'y', 'true', 'i do', 'i am', 'authorised', 'authorized'];
const NO = ['no', 'n', 'false', 'i do not', "i don't", 'not authorised', 'not authorized'];

const QUALIFICATION_SYNONYMS: Record<string, string[]> = {
  bsc: ["bachelor", "bachelor's", 'bachelors', 'bsc', 'bs', 'undergraduate', 'ba', 'beng'],
  ba: ["bachelor", "bachelor's", 'bachelors', 'ba', 'undergraduate'],
  msc: ["master", "master's", 'masters', 'msc', 'ms', 'postgraduate', 'ma', 'meng'],
  ma: ["master", "master's", 'masters', 'ma', 'postgraduate'],
  mba: ['mba', "master of business"],
  phd: ['phd', 'doctorate', 'doctoral', 'dphil'],
  alevel: ['a level', 'a levels', 'gce', 'secondary'],
  gcse: ['gcse', 'o level'],
};

const GRADE_SYNONYMS: Record<string, string[]> = {
  first: ['first', 'first class', '1st', 'first class honours', 'distinction'],
  '2:1': ['2 1', '2.1', 'upper second', 'two one', 'upper second class', 'merit'],
  '2:2': ['2 2', '2.2', 'lower second', 'two two', 'lower second class'],
  third: ['third', '3rd', 'third class'],
};

/**
 * Given a profile value and a control's option list, pick the option that best
 * represents the value. Returns null when nothing is a safe match (caller then
 * routes the field to manual review).
 */
export function matchOption(value: string, options: Opt[], target: string): Opt | null {
  const v = normalize(value);
  if (!v) return null;

  // 1. exact / substring match on label or value
  const direct =
    options.find((o) => normalize(o.label) === v || normalize(o.value) === v) ??
    options.find((o) => normalize(o.label).includes(v) || v.includes(normalize(o.label)));
  if (direct) return direct;

  // 2. yes/no
  if (YES.includes(v)) {
    const y = options.find((o) => /^(yes|y|true)\b/.test(normalize(o.label)));
    if (y) return y;
  }
  if (NO.includes(v)) {
    const n = options.find((o) => /^(no|n|false)\b/.test(normalize(o.label)));
    if (n) return n;
  }

  // 3. domain synonyms
  const synonymSets = target.endsWith('qualificationType')
    ? QUALIFICATION_SYNONYMS
    : target.endsWith('gradeValue')
      ? GRADE_SYNONYMS
      : null;
  if (synonymSets) {
    const key = Object.keys(synonymSets).find(
      (k) => k === v.replace(/[^a-z0-9]/g, '') || synonymSets[k]!.some((s) => v.includes(normalize(s))),
    );
    if (key) {
      const cands = [key, ...synonymSets[key]!];
      const hit = options.find((o) => cands.some((c) => normalize(o.label).includes(normalize(c))));
      if (hit) return hit;
    }
  }

  // 4. country: match ISO code to a label
  if (target.endsWith('country') && value.length === 2) {
    const hit = options.find((o) => normalize(o.value) === v);
    if (hit) return hit;
  }

  return null;
}
