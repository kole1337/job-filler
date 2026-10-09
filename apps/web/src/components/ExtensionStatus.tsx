'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type ExtensionStatus =
  | { state: 'checking' }
  | { state: 'installed'; version: string }
  | { state: 'missing' };

/**
 * Asks the extension's portal content script (`portal.content.ts`) whether it's
 * there. No answer within a moment → not installed (or installed after this
 * page loaded — content scripts only reach pages opened after install).
 */
export function useExtensionStatus(): ExtensionStatus {
  const [status, setStatus] = useState<ExtensionStatus>({ state: 'checking' });

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window || e.data?.source !== 'job-filler-extension' || e.data.type !== 'HELLO') return;
      setStatus({ state: 'installed', version: String(e.data.version ?? '') });
    };
    window.addEventListener('message', onMessage);
    window.postMessage({ source: 'job-filler-portal', type: 'PING' }, window.location.origin);
    const timer = setTimeout(() => setStatus((s) => (s.state === 'checking' ? { state: 'missing' } : s)), 1500);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };
  }, []);

  return status;
}

/** Header link to the install page, with a green/grey status dot. */
export function ExtensionNavLink() {
  const status = useExtensionStatus();
  const dot =
    status.state === 'installed' ? 'bg-green-500' : status.state === 'missing' ? 'bg-amber-500' : 'bg-gray-300';
  return (
    <Link href="/dashboard/extension" className="inline-flex items-center gap-2 text-sm text-gray-500 underline">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {status.state === 'installed' ? 'Extension connected' : 'Install extension'}
    </Link>
  );
}

/** Nudge on the dashboard, shown only once we know the extension is missing. */
export function ExtensionBanner() {
  const status = useExtensionStatus();
  if (status.state !== 'missing') return null;
  return (
    <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-amber-300 dark:border-amber-800">
      <p className="text-sm">
        <span className="font-semibold">The browser extension isn’t installed yet.</span> It’s what fills your
        profile into job applications.
      </p>
      <Link href="/dashboard/extension" className="btn">
        Install extension
      </Link>
    </div>
  );
}
