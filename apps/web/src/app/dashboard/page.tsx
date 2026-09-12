import { auth } from '@/auth';
import { getProfile } from '@/lib/profile-repo';
import { profileCompleteness } from '@job-filler/shared';
import { ProfileEditor } from '@/components/ProfileEditor';
import { OnboardingTour, TourReplayButton } from '@/components/OnboardingTour';

export default async function DashboardPage() {
  const session = await auth();
  const profile = await getProfile(session!.user.id);
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

      <ProfileEditor initial={profile} />
      <OnboardingTour />
    </div>
  );
}
