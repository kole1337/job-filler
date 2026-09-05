import { redirect } from 'next/navigation';
import {
  listSessionsAction,
  revokeAllSessionsAction,
  revokeSessionAction,
  deleteAccountAction,
} from '@/app/dashboard/actions';
import { signOut } from '@/auth';

export default async function SecurityPage() {
  const sessions = await listSessionsAction();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Each extension sign-in creates a session below.
        </p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Extension sessions</h2>
        {sessions.length === 0 && <p className="text-sm text-gray-500">No active extension sessions.</p>}
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{s.userAgent ?? 'Unknown device'}</p>
                <p className="text-xs text-gray-500">
                  Started {s.createdAt.toLocaleString('en-GB')} · expires{' '}
                  {s.expiresAt.toLocaleDateString('en-GB')}
                </p>
              </div>
              <form
                action={async () => {
                  'use server';
                  await revokeSessionAction(s.id);
                }}
              >
                <button className="text-red-600 underline">Revoke</button>
              </form>
            </li>
          ))}
        </ul>
        {sessions.length > 0 && (
          <form
            action={async () => {
              'use server';
              await revokeAllSessionsAction();
            }}
            className="mt-3"
          >
            <button className="btn-ghost">Revoke all</button>
          </form>
        )}
      </section>

      <section className="card border-red-200 dark:border-red-900">
        <h2 className="mb-2 font-semibold text-red-700 dark:text-red-400">Delete account</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Permanently removes your profile, education, experience and all sessions. This cannot
          be undone.
        </p>
        <form
          action={async () => {
            'use server';
            await deleteAccountAction();
            await signOut({ redirectTo: '/' });
            redirect('/');
          }}
        >
          <button className="btn bg-red-600 hover:bg-red-700">Delete my account</button>
        </form>
      </section>
    </div>
  );
}
