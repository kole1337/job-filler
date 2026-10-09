'use client';

import { useEffect, useState } from 'react';
import { CopyField } from '@/components/CopyField';
import { useExtensionStatus } from '@/components/ExtensionStatus';

type Browser = 'chrome' | 'edge' | 'brave' | 'firefox';
type Family = 'chromium' | 'firefox';

const BROWSER_NAMES: Record<Browser, string> = { chrome: 'Chrome', edge: 'Edge', brave: 'Brave', firefox: 'Firefox' };
const EXTENSIONS_PAGE: Record<Exclude<Browser, 'firefox'>, string> = {
  chrome: 'chrome://extensions',
  edge: 'edge://extensions',
  brave: 'brave://extensions',
};

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Edg/')) return 'edge';
  if ((navigator as { brave?: unknown }).brave) return 'brave';
  return 'chrome';
}

export type BuildInfo = {
  chromeDir: string;
  chromeBuilt: boolean;
  firefoxManifest: string;
  firefoxBuilt: boolean;
};

export function InstallGuide({ build }: { build: BuildInfo }) {
  const status = useExtensionStatus();
  const [browser, setBrowser] = useState<Browser>('chrome');
  const [family, setFamily] = useState<Family>('chromium');

  useEffect(() => {
    const b = detectBrowser();
    setBrowser(b);
    setFamily(b === 'firefox' ? 'firefox' : 'chromium');
  }, []);

  const chromiumBrowser = browser === 'firefox' ? 'chrome' : browser;
  const built = family === 'chromium' ? build.chromeBuilt : build.firefoxBuilt;

  return (
    <div className="space-y-6">
      <StatusCard status={status} />

      <div className="flex gap-2" role="tablist">
        {(['chromium', 'firefox'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={family === f}
            onClick={() => setFamily(f)}
            className={family === f ? 'btn' : 'btn-ghost'}
          >
            {f === 'chromium' ? 'Chrome / Edge / Brave' : 'Firefox'}
          </button>
        ))}
      </div>

      <ol className="space-y-4">
        {!built && (
          <Step n={0} title="Build the extension (one time)">
            <p>The extension hasn’t been built on this machine yet. In the project folder, run:</p>
            <CopyField value="npm run build:ext" />
            <p className="mt-2">Then refresh this page.</p>
          </Step>
        )}

        {family === 'chromium' ? (
          <>
            <Step n={1} title={`Open ${BROWSER_NAMES[chromiumBrowser]}’s extensions page`}>
              <p>Browsers don’t let websites link to this page, so paste it into the address bar:</p>
              <CopyField value={EXTENSIONS_PAGE[chromiumBrowser]} />
            </Step>
            <Step n={2} title="Turn on Developer mode">
              <p>
                It’s a toggle on the extensions page ({chromiumBrowser === 'edge' ? 'left sidebar' : 'top-right corner'}
                ).
              </p>
            </Step>
            <Step n={3} title="Click “Load unpacked” and choose this folder">
              <CopyField value={build.chromeDir} label="Copy path" />
              <PickerTip />
            </Step>
            <Step n={4} title="Pin it and come back here">
              <p>
                Click the puzzle-piece icon in the toolbar and pin <strong>Job Filler</strong>, then reload this page —
                the status above should turn green.
              </p>
            </Step>
          </>
        ) : (
          <>
            <Step n={1} title="Open Firefox’s debugging page">
              <p>Paste this into the address bar:</p>
              <CopyField value="about:debugging#/runtime/this-firefox" />
            </Step>
            <Step n={2} title="Click “Load Temporary Add-on…” and choose this file">
              <CopyField value={build.firefoxManifest} label="Copy path" />
              <PickerTip />
            </Step>
            <Step n={3} title="Reload this page">
              <p>The status above should turn green.</p>
              <p className="mt-2 text-amber-700 dark:text-amber-400">
                Firefox removes temporary add-ons when it restarts, so you’ll need to repeat step 2 after each restart.
              </p>
            </Step>
          </>
        )}
      </ol>

      <section className="card text-sm text-gray-600 dark:text-gray-400">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Updating</h2>
        <p>
          After pulling new code, run <code>npm run build:ext</code> again, then click the reload icon on the Job
          Filler card ({family === 'chromium' ? EXTENSIONS_PAGE[chromiumBrowser] : 'about:debugging'}). No need to
          remove and re-add it.
        </p>
      </section>
    </div>
  );
}

function StatusCard({ status }: { status: ReturnType<typeof useExtensionStatus> }) {
  if (status.state === 'checking') {
    return <div className="card text-sm text-gray-500">Checking for the extension…</div>;
  }
  if (status.state === 'installed') {
    return (
      <div className="card border-green-300 text-sm dark:border-green-800">
        <span className="font-semibold text-green-700 dark:text-green-400">✓ Extension connected</span>
        {status.version && <span className="text-gray-500"> (v{status.version})</span>}. Open a job application and
        click the Job Filler icon to fill it.
      </div>
    );
  }
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-amber-300 text-sm dark:border-amber-800">
      <span>
        <span className="font-semibold">Not detected in this browser.</span> Follow the steps below — it takes about a
        minute.
      </span>
      <button type="button" className="btn-ghost" onClick={() => window.location.reload()}>
        Check again
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="card flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
        {n === 0 ? '!' : n}
      </span>
      <div className="min-w-0 flex-1 text-sm text-gray-600 dark:text-gray-400">
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {children}
      </div>
    </li>
  );
}

function PickerTip() {
  return (
    <p className="mt-2 text-xs text-gray-500">
      Tip: in the file picker, press <kbd>⌘ ⇧ G</kbd> on macOS (or click the address bar on Windows / Linux) and
      paste the path.
    </p>
  );
}
