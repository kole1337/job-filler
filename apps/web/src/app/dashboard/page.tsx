import { getProfile } from '@/lib/profile-repo';
import { profileCompleteness } from '@job-filler/shared';
import { ProfileEditor } from '@/components/ProfileEditor';
import { ClearDataButton } from '@/components/ClearDataButton';
import { OnboardingTour, TourReplayButton } from '@/components/OnboardingTour';
import { ExtensionBanner } from '@/components/ExtensionStatus';

// Reads the local database on every request — never prerender this at build
// time (the SQLite file may not exist / be migrated yet when `next build` runs).
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await getProfile();
  const pct = Math.round(profileCompleteness(profile) * 100);

  return (
    <div>
      <div className="mb-6" data-tour="progress">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">Your application profile</h1>
          <TourReplayButton />
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Fill this in once. The browser extension reads it to complete applications.
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500">{pct}% of the core fields complete</p>
      </div>

      <ExtensionBanner />
      <ProfileEditor initial={profile} />
      <OnboardingTour />

      <section className="card mt-8 border-red-200 dark:border-red-900">
        <h2 className="mb-2 font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Permanently erases your profile, education, experience and custom answers from the
          local database. This cannot be undone.
        </p>
        <ClearDataButton />
      </section>
    </div>
  );
}
