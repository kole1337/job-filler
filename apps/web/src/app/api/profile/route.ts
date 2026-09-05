import { profileInputSchema } from '@job-filler/shared';
import { getApiUser, json, unauthorized } from '@/lib/api-auth';
import { corsHeaders, preflight } from '@/lib/cors';
import { getProfile, saveProfile } from '@/lib/profile-repo';

export const OPTIONS = (req: Request) => preflight(req);

export async function GET(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'));
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const profile = await getProfile(user.id);
  return json(profile, { headers: cors });
}

export async function PUT(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'));
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const parsed = profileInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: 'invalid profile', issues: parsed.error.flatten() }, { status: 400, headers: cors });
  }
  const saved = await saveProfile(user.id, parsed.data);
  return json(saved, { headers: cors });
}
