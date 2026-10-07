import { corsHeaders, preflight } from '@/lib/cors';
import { getProfile } from '@/lib/profile-repo';

export const OPTIONS = (req: Request) => preflight(req);

export async function GET(req: Request) {
  const profile = await getProfile();
  return new Response(JSON.stringify(profile, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="job-filler-profile.json"',
      ...corsHeaders(req),
    },
  });
}
