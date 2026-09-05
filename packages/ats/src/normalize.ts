const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Lowercase, strip punctuation/diacritics, collapse whitespace. */
export function normalize(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[_\-/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** All the human-readable text we know about a field, normalised and concatenated. */
export function fieldHaystack(d: {
  label?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  groupLabel?: string;
  autocomplete?: string;
}): string {
  return [d.label, d.ariaLabel, d.placeholder, d.groupLabel, d.name, d.id, d.autocomplete]
    .map((s) => normalize(s))
    .filter(Boolean)
    .join(' | ');
}

/** Does `haystack` contain `needle` as a whole word / phrase? */
export function containsPhrase(haystack: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return false;
  return new RegExp(`(^|\\s)${n.replace(/\s+/g, '\\s+')}($|\\s)`).test(haystack);
}
