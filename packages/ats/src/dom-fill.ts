import type { ControlKind } from './types';

/**
 * Framework-aware value setting. React/Vue track their own state, so setting
 * `.value` directly is ignored — we must call the native setter and dispatch
 * the events the framework listens for.
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
}

function fireInput(el: Element) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export interface FillOutcome {
  ok: boolean;
  note?: string;
}

/** Reformat an ISO date/month for the target control. */
export function formatDateFor(kind: ControlKind, iso: string): string {
  if (!iso) return iso;
  if (kind === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : iso;
  if (kind === 'month') return iso.slice(0, 7);
  // text input: fall back to a common DD/MM/YYYY-free "MM/YYYY" or "YYYY"
  const [y, m] = iso.split('-');
  return m ? `${m}/${y}` : y!;
}

export async function fillControl(
  el: HTMLElement,
  value: string,
  kind: ControlKind,
): Promise<FillOutcome> {
  el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });

  if (kind === 'checkbox') {
    const box = el as HTMLInputElement;
    const want = /^(yes|true|1)$/i.test(value);
    if (box.checked !== want) box.click();
    return { ok: true };
  }

  if (kind === 'radiogroup') {
    const doc = el.ownerDocument;
    const name = el.getAttribute('name');
    const radios = name
      ? Array.from(doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`))
      : Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    const target = radios.find(
      (r) =>
        r.value === value ||
        (r.labels && Array.from(r.labels).some((l) => l.textContent?.trim() === value)),
    );
    if (!target) return { ok: false, note: `no radio option "${value}"` };
    target.click();
    return { ok: true };
  }

  if (kind === 'select') {
    const sel = el as HTMLSelectElement;
    const opt = Array.from(sel.options).find(
      (o) => o.value === value || o.textContent?.trim() === value,
    );
    if (!opt) return { ok: false, note: `no <option> "${value}"` };
    setNativeValue(sel, opt.value);
    fireInput(sel);
    return { ok: true };
  }

  if (kind === 'combobox') {
    return fillCombobox(el, value);
  }

  // text / email / tel / url / number / date / month / textarea
  const input = el as HTMLInputElement | HTMLTextAreaElement;
  input.focus();
  setNativeValue(input, kind === 'date' || kind === 'month' ? formatDateFor(kind, value) : value);
  fireInput(input);
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  return { ok: true };
}

/**
 * Custom autocomplete / listbox (React-Select, Workday prompt, Greenhouse country).
 * Strategy: focus, type the value, wait for options, click the closest match.
 */
async function fillCombobox(el: HTMLElement, value: string): Promise<FillOutcome> {
  const doc = el.ownerDocument;
  const input =
    el.tagName === 'INPUT'
      ? (el as HTMLInputElement)
      : el.querySelector<HTMLInputElement>('input') ?? el;

  (input as HTMLElement).focus();
  (input as HTMLElement).click();

  if (input instanceof HTMLInputElement) {
    setNativeValue(input, value);
    fireInput(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) }));
  }

  const option = await waitForOption(doc, value, 2500);
  if (!option) {
    // Last resort for native-ish widgets: Enter to accept the typed value.
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    return { ok: false, note: `typed "${value}" but no option appeared — confirm manually` };
  }
  (option as HTMLElement).click();
  return { ok: true };
}

function waitForOption(doc: Document, value: string, timeoutMs: number): Promise<Element | null> {
  const wanted = value.toLowerCase();
  const selector =
    '[role="option"], li[id*="option"], .select__option, [data-automation-id="promptOption"]';
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const opts = Array.from(doc.querySelectorAll(selector));
      const exact = opts.find((o) => o.textContent?.trim().toLowerCase() === wanted);
      const partial = opts.find((o) => o.textContent?.trim().toLowerCase().includes(wanted));
      const hit = exact ?? partial;
      if (hit) return resolve(hit);
      if (Date.now() > deadline) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Draw an outline + tooltip on a field that needs user confirmation. */
export function markForReview(el: HTMLElement, message: string) {
  el.style.outline = '2px solid #f59e0b';
  el.style.outlineOffset = '1px';
  el.setAttribute('title', `Job Filler: ${message}`);
}

export function clearReviewMark(el: HTMLElement) {
  el.style.outline = '';
  el.removeAttribute('title');
}
