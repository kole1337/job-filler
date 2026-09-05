import { verifyAccessToken } from './ext-token';
import { auth } from '@/auth';

export interface ApiUser {
  id: string;
  email: string;
  via: 'extension' | 'session';
}

/**
 * Resolve the caller for an API route. Accepts either:
 *  - `Authorization: Bearer <extension access token>`
 *  - a logged-in website session cookie
 */
export async function getApiUser(req: Request): Promise<ApiUser | null> {
  const authz = req.headers.get('authorization');
  if (authz?.startsWith('Bearer ')) {
    const claims = await verifyAccessToken(authz.slice(7));
    if (claims) return { id: claims.sub, email: claims.email, via: 'extension' };
    return null;
  }
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id, email: session.user.email ?? '', via: 'session' };
  }
  return null;
}

export function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
}

export const unauthorized = () => json({ error: 'unauthorized' }, { status: 401 });
