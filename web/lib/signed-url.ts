/**
 * HMAC-signed URLs for locally served renders.
 *
 * `/api/video/[filename]` reads off a shared render directory, so without a
 * signature the only thing protecting one user's video from another is the
 * guessability of its filename. A signature binds the filename to an expiry and
 * to the server's secret, which is cheap and needs no database lookup.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { env } from './env';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a week: outlives a chat session

function sign(filename: string, expiresAt: number): string {
  return createHmac('sha256', env.auth.secret)
    .update(`${filename}:${expiresAt}`)
    .digest('base64url');
}

export function signVideoPath(filename: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const expiresAt = Date.now() + ttlMs;
  const signature = sign(filename, expiresAt);
  return `/api/video/${encodeURIComponent(filename)}?exp=${expiresAt}&sig=${signature}`;
}

export function verifyVideoSignature(
  filename: string,
  exp: string | null,
  sig: string | null
): boolean {
  if (!exp || !sig) return false;

  const expiresAt = Number.parseInt(exp, 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = Buffer.from(sign(filename, expiresAt));
  const provided = Buffer.from(sig);

  // Length check first: timingSafeEqual throws on a mismatch.
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
