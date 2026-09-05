'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SignupPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus('done');
      setMessage(body.message ?? 'Check your email to verify your account.');
    } else {
      setStatus('error');
      setMessage(
        body.issues?.fieldErrors?.password?.[0] ??
          body.error ??
          'Something went wrong. Try again.',
      );
    }
  }

  if (status === 'done') {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl font-bold">Almost there</h1>
        <p className="mt-4 rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>
        <p className="mt-4 text-sm text-gray-600">
          In development the verification link is printed to the server console.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            minLength={10}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-gray-500">
            At least 10 characters, with an uppercase letter and a number.
          </p>
        </div>
        {status === 'error' && (
          <p className="rounded bg-red-50 p-2 text-sm text-red-700">{message}</p>
        )}
        <button className="btn w-full" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{' '}
        <Link className="text-brand underline" href="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
