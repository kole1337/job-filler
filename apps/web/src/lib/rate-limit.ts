import { env } from './env';

/**
 * Fixed-window limiter. Uses Upstash Redis REST when configured, otherwise an
 * in-memory map (fine for a single dev process; NOT for multi-instance prod —
 * set UPSTASH_* in production).
 */
const memory = new Map<string, { count: number; resetAt: number }>();

async function redisIncr(key: string, windowSec: number): Promise<number> {
  const base = env.UPSTASH_REDIS_REST_URL;
  const auth = { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` };
  const incr = await fetch(`${base}/incr/${encodeURIComponent(key)}`, { headers: auth });
  const { result } = (await incr.json()) as { result: number };
  if (result === 1) {
    await fetch(`${base}/expire/${encodeURIComponent(key)}/${windowSec}`, { headers: auth });
  }
  return result;
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number;
}

export async function rateLimit(
  key: string,
  { limit, windowSec }: { limit: number; windowSec: number },
): Promise<RateResult> {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const count = await redisIncr(`rl:${key}`, windowSec);
    return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: windowSec };
  }

  const now = Date.now();
  const rec = memory.get(key);
  if (!rec || rec.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfter: windowSec };
  }
  rec.count += 1;
  return {
    ok: rec.count <= limit,
    remaining: Math.max(0, limit - rec.count),
    retryAfter: Math.ceil((rec.resetAt - now) / 1000),
  };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
