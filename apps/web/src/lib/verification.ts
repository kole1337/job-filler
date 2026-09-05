import 'server-only';
import { prisma } from './db';
import { randomToken, sha256 } from './crypto';
import { env } from './env';

type Purpose = 'email-verify' | 'password-reset';
const TTL: Record<Purpose, number> = { 'email-verify': 24 * 3600_000, 'password-reset': 3600_000 };

export async function createVerificationLink(userId: string, purpose: Purpose): Promise<string> {
  const raw = randomToken(32);
  await prisma.verificationToken.deleteMany({ where: { userId, purpose } });
  await prisma.verificationToken.create({
    data: { userId, purpose, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + TTL[purpose]) },
  });
  const path = purpose === 'email-verify' ? '/api/auth/verify-email' : '/reset-password';
  return `${env.NEXT_PUBLIC_APP_URL}${path}?token=${raw}`;
}

export async function consumeVerificationToken(
  raw: string,
  purpose: Purpose,
): Promise<{ userId: string } | null> {
  const row = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!row || row.purpose !== purpose || row.expiresAt < new Date()) return null;
  await prisma.verificationToken.delete({ where: { id: row.id } });
  return { userId: row.userId };
}
