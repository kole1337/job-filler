'use server';

import { revalidatePath } from 'next/cache';
import { profileDraftSchema } from '@job-filler/shared';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { saveProfileDraft } from '@/lib/profile-repo';
import { revokeAllSessions } from '@/lib/ext-token';

async function uid(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');
  return session.user.id;
}

export async function saveProfileAction(raw: unknown) {
  const userId = await uid();
  const parsed = profileDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.flatten() };
  }
  await saveProfileDraft(userId, parsed.data);
  revalidatePath('/dashboard');
  return { ok: true as const };
}

export async function listSessionsAction() {
  const userId = await uid();
  return prisma.session.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
}

export async function revokeSessionAction(id: string) {
  const userId = await uid();
  await prisma.session.deleteMany({ where: { id, userId } });
  revalidatePath('/dashboard/security');
}

export async function revokeAllSessionsAction() {
  await revokeAllSessions(await uid());
  revalidatePath('/dashboard/security');
}

export async function deleteAccountAction() {
  const userId = await uid();
  await prisma.user.delete({ where: { id: userId } });
}
