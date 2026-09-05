import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Job Filler</h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Enter your name, education and work history once. The browser extension fills in
        Workday, Greenhouse, Lever and Ashby applications for you — and always shows you
        what it is about to enter before you submit.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="btn">
          Create an account
        </Link>
        <Link href="/login" className="btn-ghost">
          Log in
        </Link>
      </div>

      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        {[
          ['Your data, encrypted', 'Sensitive fields (date of birth, phone, address) are encrypted at rest. Nothing is shared with employers except what you fill in.'],
          ['UK-aware education', 'Record your degree classification the way employers ask for it — 2:1, First, a percentage, or a mark.'],
          ['Never auto-submits', 'The extension fills the current step and stops. You review every field and click submit yourself.'],
          ['Works in Chrome & Firefox', 'One sign-in in the extension popup, same account as this portal.'],
        ].map(([h, p]) => (
          <div key={h} className="card">
            <h3 className="font-semibold">{h}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{p}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
