'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Scroll-reveal: adds .is-visible to every .reveal as it enters view */
/* ------------------------------------------------------------------ */

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ------------------------------------------------------------- */
/* Hero console: a form that quietly fills itself, then resets.  */
/* ------------------------------------------------------------- */

const CONSOLE_FIELDS: { label: string; value: string }[] = [
  { label: 'FULL NAME', value: 'Amelia R. Osei' },
  { label: 'EMAIL', value: 'amelia@osei.dev' },
  { label: 'PHONE', value: '+44 7911 042 618' },
  { label: 'UNIVERSITY', value: 'University of Manchester' },
  { label: 'DEGREE', value: 'BSc Computer Science — 2:1' },
  { label: 'RIGHT TO WORK (UK)', value: 'Yes' },
];

const TOTAL_CHARS = CONSOLE_FIELDS.reduce((sum, f) => sum + f.value.length, 0);
const REST_TICKS = 40; // pause with everything filled before the loop restarts

function AutofillConsole() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTick(TOTAL_CHARS);
      return;
    }
    const id = setInterval(
      () => setTick((t) => (t >= TOTAL_CHARS + REST_TICKS ? 0 : t + 1)),
      60,
    );
    return () => clearInterval(id);
  }, []);

  const done = tick >= TOTAL_CHARS;
  let remaining = tick;

  return (
    <div className="relative">
      {/* luminous backwash */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[2rem] bg-gradient-to-tr from-amber-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-2xl animate-glowpulse"
      />
      <div className="relative animate-floaty rounded-2xl border border-white/10 bg-[#0b1020]/85 shadow-2xl shadow-cyan-500/10 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <p className="font-mono2 text-[11px] tracking-[0.2em] text-cyan-300/90">
            GREENHOUSE — FORM DETECTED
          </p>
        </div>

        <div className="space-y-3 px-5 py-5">
          {CONSOLE_FIELDS.map((f) => {
            const shown = Math.max(0, Math.min(f.value.length, remaining));
            remaining -= f.value.length;
            const complete = shown === f.value.length;
            const active = shown > 0 && !complete;
            return (
              <div key={f.label}>
                <p className="font-mono2 text-[10px] tracking-[0.18em] text-slate-400">
                  {f.label}
                </p>
                <div
                  className={`mt-1 flex h-9 items-center justify-between rounded-md border px-3 text-sm transition-colors duration-300 ${
                    complete
                      ? 'border-cyan-400/40 bg-cyan-400/[0.06] text-slate-100'
                      : 'border-white/10 bg-white/[0.03] text-slate-200'
                  }`}
                >
                  <span className="truncate">
                    {f.value.slice(0, shown)}
                    {active && (
                      <span className="ml-px inline-block h-4 w-[7px] translate-y-[3px] bg-amber-300 animate-blink" />
                    )}
                  </span>
                  {complete && <span className="pl-2 text-xs text-emerald-400">✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 px-5 py-3">
          <p
            className={`font-mono2 text-[11px] tracking-[0.18em] transition-colors duration-500 ${
              done ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {done ? '► ALL FIELDS FILLED — AWAITING YOUR REVIEW' : '… FILLING FROM YOUR PROFILE'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- */
/* Small shared page pieces  */
/* ------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono2 text-xs font-medium tracking-[0.3em] text-cyan-300/90">
      {children}
    </p>
  );
}

const CTA_SOLID =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-semibold text-[#14100a] shadow-lg shadow-amber-500/25 transition hover:shadow-amber-400/40 hover:brightness-110 active:scale-[0.99]';
const CTA_GHOST =
  'inline-flex items-center justify-center rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-200';

/* -------------- */
/* The page       */
/* -------------- */

export function Landing() {
  useReveal();
  const year = useRef(new Date().getFullYear());

  return (
    <div className="min-h-screen overflow-x-clip bg-[#070a14] font-display text-slate-100 antialiased selection:bg-amber-400/30">
      {/* ================= NAV ================= */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070a14]/75 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-mono2 text-sm font-semibold tracking-[0.3em] text-slate-100">
              JOB<span className="text-amber-400">FILLER</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#problem" className="transition hover:text-slate-100">The problem</a>
            <a href="#how" className="transition hover:text-slate-100">How it works</a>
            <a href="#trust" className="transition hover:text-slate-100">Trust</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-[#14100a] transition hover:brightness-110"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative">
        {/* atmosphere */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute right-[-160px] top-24 h-[380px] w-[380px] rounded-full bg-fuchsia-500/10 blur-[110px]" />
          <div className="absolute bottom-0 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[130px]" />
          <div className="grid-floor absolute inset-x-[-20%] bottom-[-60px] h-[420px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-28 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-28">
          <div>
            <Eyebrow>SYS.01 — CAREER AUTOPILOT</Eyebrow>
            <h1 className="mt-5 text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">
              Apply everywhere.
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-400 bg-clip-text text-transparent">
                Type it once.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              Job Filler keeps one beautifully complete profile of you — and its browser
              extension pours it into Workday, Greenhouse, Lever and Ashby applications
              while you watch. You review. You submit. You get your evenings back.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/signup" className={CTA_SOLID}>
                Create your profile <span aria-hidden>→</span>
              </Link>
              <a href="#how" className={CTA_GHOST}>
                See how it works
              </a>
            </div>
            <p className="mt-5 font-mono2 text-xs tracking-[0.14em] text-slate-500">
              FREE · ENCRYPTED · NEVER SUBMITS WITHOUT YOU
            </p>
          </div>

          <AutofillConsole />
        </div>

        {/* ATS readout strip */}
        <div className="relative border-y border-white/5 bg-white/[0.02] py-4">
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-14 whitespace-nowrap font-mono2 text-xs tracking-[0.35em] text-slate-500">
              {[0, 1].map((copy) => (
                <span key={copy} className="flex gap-14">
                  <span>WORKDAY ▮ SUPPORTED</span>
                  <span>GREENHOUSE ▮ SUPPORTED</span>
                  <span>LEVER ▮ SUPPORTED</span>
                  <span>ASHBY ▮ SUPPORTED</span>
                  <span className="text-cyan-400/70">CHROME + FIREFOX ▮ ONLINE</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section id="problem" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="reveal">
            <Eyebrow>SYS.02 — THE OLD WORLD</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              You&rsquo;ve typed your own name{' '}
              <span className="text-amber-400">two hundred times</span> this year.
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-slate-400">
              Every portal asks the same questions. None of them remember you. The CV
              parser mangles your job titles, the session expires on step six of nine,
              and somewhere out there a required field is still glowing red. Applying
              became a data-entry job you never applied for.
            </p>
          </div>

          <div className="reveal" style={{ transitionDelay: '120ms' }}>
            <div className="rounded-xl border border-white/10 bg-[#0b0d16] p-1 shadow-xl">
              <div className="rounded-lg bg-black/40 px-5 py-4 font-mono2 text-[13px] leading-7">
                <p className="text-slate-500">{'// tuesday, 09:00 — application log'}</p>
                <p className="text-slate-300">
                  <span className="text-slate-600">09:14</span>{' '}
                  <span className="text-rose-400">✗</span> workday: re-enter education… again
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-600">09:31</span>{' '}
                  <span className="text-rose-400">✗</span> cv parser: &ldquo;Softwear Enginer&rdquo;
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-600">09:58</span>{' '}
                  <span className="text-rose-400">✗</span> session expired on step 6 of 9
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-600">10:02</span>{' '}
                  <span className="text-rose-400">✗</span> &ldquo;Please complete this required field.&rdquo;
                </p>
                <p className="mt-2 text-amber-300/90">
                  <span className="text-slate-600">10:03</span> ⚠ morale reserves: LOW
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* bridge line */}
        <div className="reveal mx-auto mt-28 max-w-3xl text-center">
          <p className="text-2xl font-medium leading-snug text-slate-300 sm:text-3xl">
            It was never supposed to be like this.
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              So we built the machine that remembers for you.
            </span>
          </p>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="relative scroll-mt-24 border-t border-white/5 bg-white/[0.015] py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="reveal max-w-2xl">
            <Eyebrow>SYS.03 — THE NEW PROCEDURE</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Three moves. Then it&rsquo;s routine.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Record',
                accent: 'text-amber-400 border-amber-400/30',
                body: 'Fill in your profile once — name, education, work history, the lot. UK-aware down to your 2:1, encrypted at rest.',
              },
              {
                n: '02',
                title: 'Detect',
                accent: 'text-cyan-300 border-cyan-300/30',
                body: 'Open any application on Workday, Greenhouse, Lever or Ashby. The extension recognises the form and maps every field to your profile.',
              },
              {
                n: '03',
                title: 'Review & launch',
                accent: 'text-emerald-300 border-emerald-300/30',
                body: 'One click fills the current step — then it stops. You check every answer and press submit yourself. Always.',
              },
            ].map((s, i) => (
              <div
                key={s.n}
                className="reveal group relative rounded-2xl border border-white/10 bg-[#0b1020]/70 p-7 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#0d1226]"
                style={{ transitionDelay: `${i * 110}ms` }}
              >
                <div
                  className={`inline-flex rounded-md border px-2.5 py-1 font-mono2 text-xs tracking-[0.25em] ${s.accent}`}
                >
                  MODULE {s.n}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition group-hover:opacity-100"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TRUST ================= */}
      <section id="trust" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
        <div className="reveal max-w-2xl">
          <Eyebrow>SYS.04 — FLIGHT SAFETY</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Fast should never mean reckless.
          </h2>
          <p className="mt-4 leading-relaxed text-slate-400">
            Autofill only earns its place if you can trust every character it types.
            Job Filler is built like an instrument, not a magic trick.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {[
            {
              k: 'ENCRYPTION',
              title: 'Your data, sealed',
              body: 'Sensitive fields — date of birth, phone, address — are encrypted at rest. Nothing reaches an employer except what you watch it fill in.',
            },
            {
              k: 'CONTROL',
              title: 'Never auto-submits',
              body: 'The extension fills the current step and stops dead. Every application leaves the pad only when you press the button.',
            },
            {
              k: 'LOCALE',
              title: 'UK-aware education',
              body: 'Record your degree the way employers actually ask for it — a 2:1, a First, a percentage or a mark. It lands correctly on every portal.',
            },
            {
              k: 'REACH',
              title: 'Chrome & Firefox',
              body: 'One sign-in in the extension popup, the same account as this portal. Your profile follows you across browsers.',
            },
          ].map((c, i) => (
            <div
              key={c.k}
              className="reveal rounded-2xl border border-white/10 bg-[#0b1020]/70 p-7 transition duration-300 hover:border-cyan-300/25"
              style={{ transitionDelay: `${(i % 2) * 110}ms` }}
            >
              <p className="font-mono2 text-[11px] tracking-[0.3em] text-cyan-300/80">{c.k}</p>
              <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative px-6 pb-28">
        <div className="reveal relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#101530] to-[#0a0d1c] px-8 py-16 text-center shadow-2xl sm:px-16">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full bg-amber-400/15 blur-[90px]" />
            <div className="grid-floor absolute inset-x-[-30%] bottom-[-40px] h-[240px] opacity-70" />
          </div>
          <div className="relative">
            <Eyebrow>SYS.05 — IGNITION</Eyebrow>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              The future of applying has been waiting for you.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Two minutes to build your profile. A lifetime of never retyping it.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup" className={CTA_SOLID}>
                Create your account — it&rsquo;s free
              </Link>
              <Link href="/login" className={CTA_GHOST}>
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          <p className="font-mono2 text-xs tracking-[0.3em]">
            JOB<span className="text-amber-400/80">FILLER</span>
          </p>
          <p>One profile, every application. © {year.current}</p>
        </div>
      </footer>
    </div>
  );
}
