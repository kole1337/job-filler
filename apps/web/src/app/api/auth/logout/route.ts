import { refreshSchema } from '@job-filler/shared';
import { revokeRefreshToken } from '@/lib/ext-token';
import { json } from '@/lib/api-auth';
import { corsHeaders, preflight } from '@/lib/cors';

export const OPTIONS = (req: Request) => preflight(req);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'));
  const parsed = refreshSchema.safeParse(await req.json().catch(() => null));
  if (parsed.success) await revokeRefreshToken(parsed.data.refreshToken);
  return json({ ok: true }, { headers: cors });
}
