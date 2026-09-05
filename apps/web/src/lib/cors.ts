import { allowedExtensionOrigins, env } from './env';

/** Origins allowed to call the API with credentials: the portal + the extension. */
function allowlist(): string[] {
  return [env.NEXT_PUBLIC_APP_URL, ...allowedExtensionOrigins()].filter(Boolean);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && allowlist().includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : 'null',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export function withCors(req: Request, res: Response): Response {
  const h = corsHeaders(req.headers.get('origin'));
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}
