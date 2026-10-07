import type { PlanResult, SerializableMatch } from '@/src/lib/messages';
import { getSettings } from '@/src/lib/storage';

const app = document.getElementById('app')!;
const send = (msg: unknown): Promise<any> => browser.runtime.sendMessage(msg);

async function sendToActiveTab(msg: Record<string, unknown>): Promise<any> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return browser.tabs.sendMessage(tab.id, msg);
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { class?: string; style?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const { class: cls, style, ...rest } = props as Record<string, unknown>;
  if (cls) el.className = cls as string;
  if (typeof style === 'string') el.setAttribute('style', style);
  Object.assign(el, rest);
  for (const c of children) el.append(c);
  return el;
}

function render(node: Node) {
  app.replaceChildren(node);
}

let portalUrl = 'http://localhost:3000';

async function init() {
  portalUrl = (await getSettings()).portalUrl;
  const res = await send({ type: 'GET_PROFILE' });
  if (res?.error) renderUnreachable(res.error);
  else renderMain(res?.fetchedAt);
}

/* ---------------- portal unreachable ---------------- */

function renderUnreachable(error: string) {
  const retryBtn = h('button', {}, 'Try again');
  retryBtn.addEventListener('click', () => {
    retryBtn.disabled = true;
    retryBtn.textContent = 'Retrying…';
    init();
  });

  render(
    h(
      'div',
      {},
      h('h1', {}, 'Job Filler'),
      h('p', { class: 'err' }, error),
      h(
        'p',
        { class: 'muted' },
        `Make sure the portal is running at ${portalUrl} (npm run dev:web), then retry.`,
      ),
      h('div', { class: 'row' }, retryBtn),
      settingsLink(),
    ),
  );
}

/* ---------------- main ---------------- */

function renderMain(profileFetchedAt?: number) {
  const container = h('div', {});
  const info = h(
    'p',
    { class: 'muted' },
    profileFetchedAt ? `Profile synced ${new Date(profileFetchedAt).toLocaleString()}` : 'Profile not synced yet',
  );
  const msg = h('p', { class: 'ok' });
  const results = h('div', {});

  const syncBtn = h('button', { class: 'secondary' }, 'Re-sync');
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing…';
    const res = await send({ type: 'SYNC_PROFILE' });
    syncBtn.disabled = false;
    syncBtn.textContent = 'Re-sync';
    msg.textContent = res?.ok
      ? `Synced: ${res.education} education, ${res.experience} experience`
      : res?.error ?? 'Sync failed';
  });

  const scanBtn = h('button', {}, 'Scan this page');
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';
    msg.textContent = '';
    try {
      const s = await getSettings();
      const plan: PlanResult = await sendToActiveTab({ type: 'PLAN_FILL', minConfidence: s.minConfidence });
      if ((plan as { error?: string }).error) throw new Error((plan as { error?: string }).error);
      results.replaceChildren(renderPlan(plan, msg));
    } catch (e) {
      msg.textContent = String((e as Error).message);
      results.replaceChildren();
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan this page';
    }
  });

  container.append(
    h('h1', {}, 'Job Filler'),
    info,
    h('div', { class: 'row' }, syncBtn, scanBtn, h('a', { href: `${portalUrl}/dashboard`, target: '_blank' }, 'Edit profile')),
    msg,
    results,
    settingsLink(),
  );
  render(container);
}

function renderPlan(plan: PlanResult, msg: HTMLElement): Node {
  const wrap = h('div', {});
  const selected = new Set(plan.autofill.map((m) => m.ref));

  wrap.append(
    h('section', {}, h('strong', {}, `${plan.atsId.toUpperCase()} · ${plan.steps.length} step(s)`)),
    ...plan.notes.map((n) => h('p', { class: 'muted' }, `• ${n}`)),
  );

  const list = (title: string, items: SerializableMatch[], low = false) => {
    if (!items.length) return h('span');
    const sec = h('section', {}, h('strong', {}, title));
    for (const m of items) {
      const cb = h('input', { type: 'checkbox', checked: selected.has(m.ref) });
      cb.style.width = 'auto';
      cb.addEventListener('change', () => (cb.checked ? selected.add(m.ref) : selected.delete(m.ref)));
      sec.append(
        h(
          'label',
          { class: 'field row' },
          cb,
          h(
            'span',
            {},
            h('span', {}, m.label),
            h('span', { class: `badge ${low ? 'low' : ''}` }, `${Math.round(m.confidence * 100)}%`),
            h('div', { class: 't' }, `→ ${m.value.slice(0, 44)}  (${m.target})`),
          ),
        ),
      );
    }
    return sec;
  };

  wrap.append(
    list(`Will fill (${plan.autofill.length})`, plan.autofill),
    list(`Check first (${plan.review.length})`, plan.review, true),
  );

  if (plan.unmatched.length) {
    const sec = h('section', {}, h('strong', {}, `Couldn't map (${plan.unmatched.length})`));
    for (const u of plan.unmatched)
      sec.append(h('div', { class: 'field' }, u.label, h('div', { class: 't' }, u.reason)));
    sec.append(h('p', { class: 'muted' }, 'Add these on the portal "Extra questions" tab to fill them next time.'));
    wrap.append(sec);
  }

  const fillBtn = h('button', { style: 'margin-top:10px' }, 'Fill selected');
  fillBtn.addEventListener('click', async () => {
    fillBtn.disabled = true;
    fillBtn.textContent = 'Filling…';
    const res = await sendToActiveTab({ type: 'APPLY_FILL', refs: [...selected] });
    fillBtn.disabled = false;
    fillBtn.textContent = 'Fill selected';
    msg.textContent =
      (res as { error?: string }).error ??
      `Filled ${res.filled} field(s)${res.failed?.length ? `, ${res.failed.length} need attention` : ''}. Review the page, then submit yourself.`;
  });
  wrap.append(fillBtn);
  return wrap;
}

function settingsLink(): HTMLElement {
  const a = h('a', { href: '#' }, 'Settings');
  a.style.cssText = 'display:block;margin-top:12px;font-size:12px';
  a.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
  return a;
}

init();
