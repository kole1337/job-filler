import { NextResponse, type NextRequest } from 'next/server';

/**
 * The portal has no login, so it must only answer requests addressed to this
 * machine. The npm scripts bind to 127.0.0.1, which keeps other devices out;
 * this check also blocks DNS rebinding, where a website points its own domain
 * at 127.0.0.1 so the browser treats your portal as same-origin with it.
 * Such requests still carry the attacker's domain in `Host`, so reject
 * anything that isn't a loopback hostname.
 */
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  if (!LOOPBACK_HOST.test(host)) {
    return new NextResponse('Forbidden: the portal only accepts requests to localhost.', { status: 403 });
  }
  return NextResponse.next();
}
