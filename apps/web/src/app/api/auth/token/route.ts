import { credentialsSchema, type TokenResponse } from '@job-filler/shared';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { issueAccessToken, issueRefreshToken } from '@/lib/ext-token';
import { json } from '@/lib/api-auth';
import { corsHeaders, preflight } from '@/lib/cors';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const OPTIONS = (req: Request) => preflight(req);

/** Extension login — exchange email/password for access + refresh tokens. */
export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'));
  const ip = clientIp(req.headers);
  const rl = await rateLimit(`token:${ip}`, { limit: 10, windowSec: 900 });
  if (!rl.ok) return json({ error: 'too many attempts' }, { status: 429, headers: cors });

  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid credentials' }, { status: 400, headers: cors });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const ok = user && user.emailVerified && (await verifyPassword(user.passwordHash, parsed.data.password));
  if (!ok || !user) {
    // generic error — do not reveal which check failed
    return json({ error: 'invalid email or password' }, { status: 401, headers: cors });
  }

  const { accessToken, expiresIn } = await issueAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, req.headers.get('user-agent') ?? undefined);
  const body: TokenResponse = {
    accessToken,
    expiresIn,
    refreshToken,
    user: { id: user.id, email: user.email },
  };
  return json(body, { headers: cors });
}
