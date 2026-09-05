import { getApiUser, unauthorized } from '@/lib/api-auth';
import { corsHeaders, preflight } from '@/lib/cors';
import { getProfile } from '@/lib/profile-repo';

export const OPTIONS = (req: Request) => preflight(req);

export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const profile = await getProfile(user.id);
  return new Response(JSON.stringify(profile, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="job-filler-profile.json"',
      ...corsHeaders(req.headers.get('origin')),
    },
  });
}
