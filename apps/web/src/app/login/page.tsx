import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verified?: string; error?: string }>;
}) {
  const sp = await searchParams;

  async function login(formData: FormData) {
    'use server';
    try {
      await signIn('credentials', {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        redirect: false,
      });
    } catch (err) {
      if (err instanceof AuthError) redirect('/login?error=1');
      throw err;
    }
    redirect(sp.next && sp.next.startsWith('/') ? sp.next : '/dashboard');
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-6 py-16">
      <h1 className="text-2xl font-bold">Log in</h1>
      {sp.verified === '1' && (
        <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">
          Email verified — you can log in now.
        </p>
      )}
      {sp.error && (
        <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
          Invalid email or password, or your email is not verified yet.
        </p>
      )}
      <form action={login} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <button className="btn w-full" type="submit">
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        No account?{' '}
        <Link className="text-brand underline" href="/signup">
          Sign up
        </Link>
      </p>
    </main>
  );
}
