import type { ControlKind, FieldDescriptor } from './types';

/**
 * DOM -> FieldDescriptor[] extraction. Runs in the content script.
 * Every element gets a `ref` (an attribute we stamp) so we can find it again
 * after the user edits the review list.
 */
const REF_ATTR = 'data-jobfiller-ref';

let refCounter = 0;

export function elementRef(el: Element): string {
  let ref = el.getAttribute(REF_ATTR);
  if (!ref) {
    ref = `jf-${Date.now().toString(36)}-${refCounter++}`;
    el.setAttribute(REF_ATTR, ref);
  }
  return ref;
}

export function findByRef(root: ParentNode, ref: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[${REF_ATTR}="${CSS.escape(ref)}"]`);
}

function visibleText(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function labelFor(el: HTMLElement, doc: Document): string | undefined {
  const id = el.getAttribute('id');
  if (id) {
    const lbl = doc.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl) return visibleText(lbl);
  }
  const wrapping = el.closest('label');
  if (wrapping) return visibleText(wrapping);
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const parts = labelledby
      .split(/\s+/)
      .map((x) => visibleText(doc.getElementById(x)))
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  // Fallback: a preceding sibling / parent's label-ish element
  const container = el.closest('[class*="field"],[class*="form-group"],[class*="question"],fieldset,div');
  const guess = container?.querySelector('label,legend,.label,[class*="label"]');
  if (guess && !guess.contains(el)) return visibleText(guess);
  return undefined;
}

function groupLabel(el: HTMLElement): string | undefined {
  const fs = el.closest('fieldset');
  const legend = fs?.querySelector('legend');
  if (legend) return visibleText(legend);
  const section = el.closest('section,[role="group"],[class*="section"]');
  const heading = section?.querySelector('h1,h2,h3,h4,legend,[class*="section-title"],[class*="heading"]');
  return heading ? visibleText(heading) : undefined;
}

function kindOf(el: HTMLElement): ControlKind {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';
  if (el.getAttribute('role') === 'combobox' || el.getAttribute('aria-haspopup') === 'listbox')
    return 'combobox';
  if (el.getAttribute('role') === 'radiogroup') return 'radiogroup';
  if (tag === 'input') {
    const t = (el as HTMLInputElement).type;
    switch (t) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'month':
        return 'month';
      case 'checkbox':
        return 'checkbox';
      case 'radio':
        return 'radio';
      case 'file':
        return 'file';
      default:
        return 'text';
    }
  }
  return 'unknown';
}

function optionsOf(el: HTMLElement): FieldDescriptor['options'] {
  if (el.tagName.toLowerCase() === 'select') {
    return Array.from((el as HTMLSelectElement).options).map((o) => ({
      value: o.value,
      label: o.textContent?.trim() ?? o.value,
    }));
  }
  // radiogroup: collect radios sharing the same name
  if (el.getAttribute('role') === 'radiogroup') {
    const radios = el.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    return Array.from(radios).map((r) => ({
      value: r.value,
      label: labelFor(r, el.ownerDocument) ?? r.value,
    }));
  }
  return undefined;
}

const RELEVANT = 'input, select, textarea, [role="combobox"], [role="radiogroup"]';
const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'password', 'search']);

export interface ExtractOptions {
  /** Only extract fields inside this container (e.g. the current Workday step). */
  root?: ParentNode;
}

export function extractFields(doc: Document, opts: ExtractOptions = {}): FieldDescriptor[] {
  const root = opts.root ?? doc;
  const els = Array.from(root.querySelectorAll<HTMLElement>(RELEVANT));
  const seenRadioNames = new Set<string>();
  const out: FieldDescriptor[] = [];

  for (const el of els) {
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const style = el.ownerDocument.defaultView?.getComputedStyle(el);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) continue;

    // Group loose radios by name into a single radiogroup descriptor.
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      if (!el.name || seenRadioNames.has(el.name)) continue;
      seenRadioNames.add(el.name);
      const group = doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
      out.push({
        ref: elementRef(el),
        kind: 'radiogroup',
        name: el.name,
        label: labelFor(el, doc) ?? groupLabel(el),
        groupLabel: groupLabel(el),
        required: el.required,
        options: Array.from(group).map((r) => ({ value: r.value, label: labelFor(r, doc) ?? r.value })),
      });
      continue;
    }

    const attrs: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) {
      if (a.name.startsWith('data-') || a.name.startsWith('aria-')) attrs[a.name] = a.value;
    }
    // Workday wraps each control in a <div data-automation-id="formField-<name>">.
    const formField = el
      .closest('[data-automation-id^="formField-"]')
      ?.getAttribute('data-automation-id');
    if (formField) attrs.formField = formField;

    out.push({
      ref: elementRef(el),
      kind: kindOf(el),
      label: labelFor(el, doc),
      ariaLabel: el.getAttribute('aria-label') ?? undefined,
      name: el.getAttribute('name') ?? undefined,
      id: el.getAttribute('id') ?? undefined,
      placeholder: el.getAttribute('placeholder') ?? undefined,
      autocomplete: el.getAttribute('autocomplete') ?? undefined,
      required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      groupLabel: groupLabel(el),
      options: optionsOf(el),
      attrs: Object.keys(attrs).length ? attrs : undefined,
      sectionIndex: inferSectionIndex(el),
    });
  }
  return out;
}

/** Rough guess at which repeated block (0-based) a field sits in. */
function inferSectionIndex(el: HTMLElement): number | undefined {
  const block = el.closest(
    '[data-automation-id*="workExperience"],[data-automation-id*="education"],' +
      '[id*="education_records_attributes_"],[id*="employment_records_attributes_"],' +
      '[class*="repeat"],[class*="entry"]',
  );
  if (!block) return undefined;
  const idAttr = block.id || block.getAttribute('data-automation-id') || '';
  const m = idAttr.match(/(\d+)/);
  if (m) return Math.max(0, Number(m[1]) - (idAttr.includes('records_attributes') ? 0 : 1));
  const siblings = block.parentElement
    ? Array.from(block.parentElement.children).filter((c) => c.className === block.className)
    : [];
  const idx = siblings.indexOf(block);
  return idx >= 0 ? idx : undefined;
}
