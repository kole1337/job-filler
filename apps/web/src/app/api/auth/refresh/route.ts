import { refreshSchema, type TokenResponse } from '@job-filler/shared';
import { issueAccessToken, rotateRefreshToken } from '@/lib/ext-token';
import { json } from '@/lib/api-auth';
import { corsHeaders, preflight } from '@/lib/cors';

export const OPTIONS = (req: Request) => preflight(req);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'));
  const parsed = refreshSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid input' }, { status: 400, headers: cors });

  const rotated = await rotateRefreshToken(
    parsed.data.refreshToken,
    req.headers.get('user-agent') ?? undefined,
  );
  if (!rotated) return json({ error: 'invalid or expired token' }, { status: 401, headers: cors });

  const { accessToken, expiresIn } = await issueAccessToken({
    id: rotated.userId,
    email: rotated.email,
  });
  const body: TokenResponse = {
    accessToken,
    expiresIn,
    refreshToken: rotated.refreshToken,
    user: { id: rotated.userId, email: rotated.email },
  };
  return json(body, { headers: cors });
}
