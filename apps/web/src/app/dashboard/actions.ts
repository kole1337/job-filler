'use server';

import { revalidatePath } from 'next/cache';
import { profileDraftSchema } from '@job-filler/shared';
import { clearProfile, saveProfileDraft } from '@/lib/profile-repo';

export async function saveProfileAction(raw: unknown) {
  const parsed = profileDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.flatten() };
  }
  await saveProfileDraft(parsed.data);
  revalidatePath('/dashboard');
  return { ok: true as const };
}

/** Wipes the profile, education, experience and custom answers. Cannot be undone. */
export async function clearProfileAction() {
  await clearProfile();
  revalidatePath('/dashboard');
}
