import { clearAll, getSettings, setSettings, type Settings } from '@/src/lib/storage';

const app = document.getElementById('app')!;

function row(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const wrap = document.createElement('div');
  const l = document.createElement('label');
  l.className = 'muted';
  l.textContent = label;
  wrap.append(l, control);
  if (hint) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = hint;
    wrap.append(p);
  }
  return wrap;
}

async function render() {
  const s: Settings = await getSettings();
  app.replaceChildren();

  const h1 = document.createElement('h1');
  h1.textContent = 'Job Filler settings';

  const portal = document.createElement('input');
  portal.value = s.portalUrl;
  portal.addEventListener('change', () => save({ portalUrl: portal.value.trim() }));

  const conf = document.createElement('input');
  conf.type = 'range';
  conf.min = '0.4';
  conf.max = '0.95';
  conf.step = '0.05';
  conf.value = String(s.minConfidence);
  const confLabel = () => `Auto-fill confidence threshold: ${Math.round(Number(conf.value) * 100)}%`;
  const confRow = row(confLabel(), conf, 'Fields below this score go to "Check first" instead of being pre-selected.');
  conf.addEventListener('input', () => {
    (confRow.firstChild as HTMLElement).textContent = confLabel();
  });
  conf.addEventListener('change', () => save({ minConfidence: Number(conf.value) }));

  const always = document.createElement('input');
  always.type = 'checkbox';
  always.checked = s.alwaysReview;
  always.style.width = 'auto';
  always.addEventListener('change', () => save({ alwaysReview: always.checked }));
  const alwaysRow = document.createElement('label');
  alwaysRow.className = 'row';
  alwaysRow.append(always, document.createTextNode(' Always let me review before anything is filled'));

  const status = document.createElement('p');
  status.className = 'ok';

  const clearBtn = document.createElement('button');
  clearBtn.className = 'secondary';
  clearBtn.textContent = 'Clear cached profile';
  clearBtn.addEventListener('click', async () => {
    await clearAll();
    status.textContent = 'Cached profile cleared.';
  });

  async function save(patch: Partial<Settings>) {
    await setSettings(patch);
    status.textContent = 'Saved.';
    setTimeout(() => (status.textContent = ''), 1500);
  }

  app.append(h1, row('Portal URL', portal), confRow, alwaysRow, document.createElement('hr'), clearBtn, status);
}

render();
