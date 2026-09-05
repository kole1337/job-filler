import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import type { AccessTokenClaims } from '@job-filler/shared';
import { prisma } from './db';
import { env } from './env';
import { randomToken, sha256 } from './crypto';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;

const secret = () => new TextEncoder().encode(env.EXT_JWT_SECRET);

export async function issueAccessToken(user: { id: string; email: string }): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const accessToken = await new SignJWT({ email: user.email, scope: 'extension' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secret());
  return { accessToken, expiresIn: ACCESS_TTL_SECONDS };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.scope !== 'extension' || !payload.sub) return null;
    return payload as unknown as AccessTokenClaims;
  } catch {
    return null;
  }
}

/** Create a rotating opaque refresh token and persist its hash. */
export async function issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
  const raw = randomToken(48);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(raw),
      userAgent: userAgent?.slice(0, 255),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 864e5),
    },
  });
  return raw;
}

export async function rotateRefreshToken(
  rawToken: string,
  userAgent?: string,
): Promise<{ userId: string; email: string; refreshToken: string } | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // one-time use: delete the old, mint a new
  await prisma.session.delete({ where: { id: session.id } });
  const next = await issueRefreshToken(session.userId, userAgent);
  return { userId: session.userId, email: session.user.email, refreshToken: next };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: sha256(rawToken) } });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
