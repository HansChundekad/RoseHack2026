/**
 * In-memory token-bucket rate limiter.
 * NOTE: per-instance only — resets on cold start. Fine for current scale.
 */

type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult { allowed: boolean; retryAfterSec: number; }

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { tokens: limit - 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (b.tokens <= 0) {
    return { allowed: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.tokens -= 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}
