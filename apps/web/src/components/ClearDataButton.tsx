'use client';

import { useTransition } from 'react';
import { clearProfileAction } from '@/app/dashboard/actions';

export function ClearDataButton() {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm('Permanently delete your saved profile? This cannot be undone.')) return;
    startTransition(async () => {
      await clearProfileAction();
      window.location.reload();
    });
  };

  return (
    <button className="btn bg-red-600 hover:bg-red-700" onClick={onClick} disabled={pending}>
      {pending ? 'Clearing…' : 'Clear all local data'}
    </button>
  );
}
