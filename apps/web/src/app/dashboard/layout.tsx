import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold">
          Job Filler
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">{session.user.email}</span>
          <Link href="/dashboard/security" className="text-brand underline">
            Security
          </Link>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button className="text-gray-600 underline" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
