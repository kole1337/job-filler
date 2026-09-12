'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'jf.tour.v1';
const START_EVENT = 'jf:start-tour';

type Step = {
  /** matches a [data-tour="…"] element; omit for a centred welcome/finish card */
  target?: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    title: 'Welcome aboard 👋',
    body: 'This is your profile HQ. Spend two minutes filling it in once, and the browser extension will pour it into every Workday, Greenhouse, Lever and Ashby application for you. Fancy a 30-second look around? You can close this tour at any time.',
  },
  {
    target: 'progress',
    title: 'Your completeness meter',
    body: 'This bar tracks the core fields of your profile. The extension can only fill in what you have saved here — the closer to 100%, the fewer blanks left for you on real applications.',
  },
  {
    target: 'tabs',
    title: 'Four sections, any order',
    body: 'Everything lives in these tabs: Personal details, Education, Work experience, and Extra questions for the odd bits portals love to ask. Work through them in whatever order you like.',
  },
  {
    target: 'form',
    title: 'Type each answer once',
    body: 'Enter your details exactly as employers ask for them — UK degree grades like a 2:1 or a First included. Sensitive fields such as your date of birth and phone number are encrypted at rest.',
  },
  {
    target: 'save',
    title: 'Save when you are done',
    body: 'Hit “Save profile” after making changes. The extension reads your saved profile, so unsaved edits stay on this page only.',
  },
  {
    title: 'Last step: the extension 🚀',
    body: 'Install the Job Filler extension in Chrome or Firefox and sign in with this same account. Then open any job application and press Fill — it completes the current step and stops, so you always review before you submit. That’s the whole tour!',
  },
];

const PAD = 8; // spotlight padding around the target
const TIP_W = 344;

type Rect = { top: number; left: number; width: number; height: number };

export function TourReplayButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(START_EVENT))}
      className="text-sm text-brand underline"
    >
      Replay tour
    </button>
  );
}

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const close = useCallback((completed: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, completed ? 'done' : 'dismissed');
    } catch {
      /* private browsing etc. — tour just shows again next visit */
    }
    setOpen(false);
    setStep(0);
  }, []);

  // Auto-start for first-time visitors + manual replay trigger.
  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(STORAGE_KEY);
    } catch {
      seen = 'done';
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!seen) timer = setTimeout(() => setOpen(true), 500);

    const onStart = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(START_EVENT, onStart);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(START_EVENT, onStart);
    };
  }, []);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Measure the current target and keep the measurement fresh on scroll/resize.
  useLayoutEffect(() => {
    if (!open) return;
    const sel = STEPS[step]?.target;
    const el = sel ? document.querySelector<HTMLElement>(`[data-tour="${sel}"]`) : null;

    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    // re-measure while the smooth scroll settles
    const settle = setInterval(measure, 120);
    const stopSettle = setTimeout(() => clearInterval(settle), 900);

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      clearInterval(settle);
      clearTimeout(stopSettle);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, step]);

  if (!open) return null;

  const current = STEPS[step];
  if (!current) return null;
  const spotlight = current.target ? rect : null;
  const last = step === STEPS.length - 1;

  // Tooltip placement: below the target if there is room, otherwise above;
  // centred when the step has no target.
  let tipStyle: React.CSSProperties;
  if (spotlight) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(
      Math.max(12, spotlight.left + spotlight.width / 2 - TIP_W / 2),
      vw - TIP_W - 12,
    );
    const below = spotlight.top + spotlight.height + PAD + 16;
    const placeBelow = below + 260 < vh || spotlight.top < 300;
    tipStyle = placeBelow
      ? { top: below, left, width: TIP_W }
      : { bottom: vh - spotlight.top + PAD + 16, left, width: TIP_W };
  } else {
    tipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: Math.min(TIP_W + 60, typeof window !== 'undefined' ? window.innerWidth - 24 : TIP_W),
    };
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Onboarding tour">
      {/* click-catcher so the page underneath is inert while the tour runs */}
      <div className="absolute inset-0" onClick={() => close(false)} />

      {/* dark veil with a spotlight cut-out (or full veil on centred steps) */}
      {spotlight ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-brand/80 transition-all duration-300"
          style={{
            top: spotlight.top - PAD,
            left: spotlight.left - PAD,
            width: spotlight.width + PAD * 2,
            height: spotlight.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(9, 12, 24, 0.62)',
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: 'rgba(9,12,24,0.62)' }} />
      )}

      {/* tooltip card */}
      <div
        className="absolute rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        style={tipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{current.title}</h3>
          <button
            type="button"
            onClick={() => close(false)}
            aria-label="Close tutorial"
            className="-mr-1 -mt-1 rounded p-1 text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {current.body}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-4 bg-brand' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step === 0 ? (
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-500 transition hover:text-gray-800 dark:hover:text-gray-200"
              >
                Skip tour
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-500 transition hover:text-gray-800 dark:hover:text-gray-200"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? close(true) : setStep((s) => s + 1))}
              className="btn px-4 py-1.5"
            >
              {last ? 'Finish' : step === 0 ? 'Show me around' : 'Next'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-right text-[11px] text-gray-400">
          {step + 1} / {STEPS.length}
        </p>
      </div>
    </div>
  );
}
