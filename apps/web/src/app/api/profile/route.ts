import { profileInputSchema } from '@job-filler/shared';
import { corsHeaders, preflight } from '@/lib/cors';
import { getProfile, saveProfile } from '@/lib/profile-repo';

export const OPTIONS = (req: Request) => preflight(req);

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

export async function GET(req: Request) {
  const profile = await getProfile();
  return json(profile, { headers: corsHeaders(req) });
}

export async function PUT(req: Request) {
  const cors = corsHeaders(req);
  const parsed = profileInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: 'invalid profile', issues: parsed.error.flatten() }, { status: 400, headers: cors });
  }
  const saved = await saveProfile(parsed.data);
  return json(saved, { headers: cors });
}
