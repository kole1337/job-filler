/**
 * There's no login, so there's nothing an `Authorization` header or cookie
 * protects — but without any CORS check at all, any webpage open in the same
 * browser could silently read your saved profile from `localhost` via
 * `fetch`. So: only the browser extension (which runs in its own
 * `chrome-extension://` / `moz-extension://` origin — not spoofable by a
 * normal website) or the portal's own origin may call this API.
 * No configuration needed.
 */
const EXTENSION_ORIGIN = /^(chrome|moz)-extension:\/\//;

function isAllowed(origin: string | null, selfOrigin: string | null): boolean {
  if (!origin) return false;
  if (EXTENSION_ORIGIN.test(origin)) return true;
  return selfOrigin != null && origin === selfOrigin;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowed = isAllowed(origin, new URL(req.url).origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : 'null',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
