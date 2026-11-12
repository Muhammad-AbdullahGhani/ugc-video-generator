/**
 * In-process rate limiting (token bucket).
 *
 * Deliberately dependency-free. This is correct for a single instance and is the
 * right first line of defence for a self-hosted or single-region deployment. On a
 * multi-instance platform each instance keeps its own buckets, so the effective
 * limit is `limit * instances` — swap `consume()` for a Redis/Upstash-backed
 * implementation when you scale horizontally. The call sites do not change.
 */

import { AppError } from './errors';
import { env } from './env';

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

/** Buckets idle for longer than this are dropped so the map cannot grow forever. */
const SWEEP_AFTER_MS = 60 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_AFTER_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > SWEEP_AFTER_MS) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the next token is available. */
  retryAfterSeconds: number;
}

/**
 * Take one token from `key`'s bucket.
 *
 * @param limit    bucket capacity (burst size)
 * @param windowMs time to refill the bucket completely
 */
export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const refillPerMs = limit / windowMs;
  const bucket = buckets.get(key) ?? { tokens: limit, updatedAt: now };

  const refilled = Math.min(limit, bucket.tokens + (now - bucket.updatedAt) * refillPerMs);

  if (refilled < 1) {
    buckets.set(key, { tokens: refilled, updatedAt: now });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((1 - refilled) / refillPerMs / 1000)),
    };
  }

  buckets.set(key, { tokens: refilled - 1, updatedAt: now });
  return { allowed: true, remaining: Math.floor(refilled - 1), retryAfterSeconds: 0 };
}

/** Throws `RATE_LIMITED` instead of returning a result. */
export function enforce(key: string, limit: number, windowMs: number): void {
  const result = consume(key, limit, windowMs);
  if (!result.allowed) {
    throw new AppError('RATE_LIMITED', `rate limit hit for ${key} (retry in ${result.retryAfterSeconds}s)`);
  }
}

/**
 * Best-effort client address. Proxy headers are spoofable, so this is a cost
 * control for honest clients and a speed bump for dishonest ones — never an
 * authorization signal.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export const LIMITS = {
  chat: { limit: env.limits.chatPerMinute, windowMs: 60_000 },
  render: { limit: env.limits.rendersPerHour, windowMs: 60 * 60_000 },
  /** Anonymous callers share a much tighter budget. */
  anonymousChat: { limit: Math.max(3, Math.floor(env.limits.chatPerMinute / 4)), windowMs: 60_000 },
} as const;
