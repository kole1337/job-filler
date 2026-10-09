'use client';

import { useState } from 'react';

/** Read-only monospace value with a Copy button. */
export function CopyField({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the text is selectable, so the user can copy it by hand.
    }
  };

  return (
    <div className="mt-2 flex items-stretch gap-2">
      <code className="input min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap font-mono text-xs">
        {value}
      </code>
      <button type="button" className="btn-ghost shrink-0" onClick={copy}>
        {copied ? 'Copied ✓' : label}
      </button>
    </div>
  );
}
