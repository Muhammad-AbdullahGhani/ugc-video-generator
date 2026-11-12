/**
 * SSRF-resistant outbound fetch.
 *
 * Any URL that originates from user input is attacker-controlled, and a plain
 * `fetch(url)` on a cloud host reaches the instance metadata service, internal
 * admin panels, and anything else on the private network. Every fetch of a
 * user-supplied URL goes through here.
 *
 * Guarantees:
 *   - http/https only
 *   - hostname resolved and every resolved address checked against private,
 *     loopback, link-local and reserved ranges (blocks 169.254.169.254 and friends)
 *   - redirects followed manually, re-validating the host on every hop
 *   - hard timeout
 *   - response body truncated at a byte ceiling rather than buffered whole
 */

import dns from 'dns/promises';
import net from 'net';
import { AppError } from './errors';
import { env } from './env';
import { createLogger } from './logger';

const log = createLogger('safe-fetch');

const MAX_REDIRECTS = 3;

/** IPv4 ranges that must never be reachable from a user-supplied URL. */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // unparseable: refuse rather than guess
  }
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 169 && b === 254) return true; // link-local — cloud metadata lives here
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 168) return true; // private
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0]; // strip zone id

  if (addr === '::' || addr === '::1') return true; // unspecified / loopback
  if (addr.startsWith('fe8') || addr.startsWith('fe9')) return true; // link-local
  if (addr.startsWith('fea') || addr.startsWith('feb')) return true;
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // unique local
  if (addr.startsWith('ff')) return true; // multicast

  // IPv4-mapped (::ffff:169.254.169.254) must be judged by its IPv4 half.
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);

  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return true;
}

/**
 * Validate a URL's shape and resolve its host, rejecting anything that points
 * inside the network. Returns the parsed URL when safe.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError('URL_NOT_ALLOWED', `unparseable url: ${rawUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('URL_NOT_ALLOWED', `blocked scheme: ${parsed.protocol}`);
  }

  // Credentials in a URL are a redirect-laundering trick; no legitimate product page needs them.
  if (parsed.username || parsed.password) {
    throw new AppError('URL_NOT_ALLOWED', 'credentials in url');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  // A bare IP literal skips DNS entirely — check it directly.
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new AppError('URL_NOT_ALLOWED', `blocked ip literal: ${hostname}`);
    }
    return parsed;
  }

  if (!hostname.includes('.') || hostname.endsWith('.localhost')) {
    throw new AppError('URL_NOT_ALLOWED', `non-public hostname: ${hostname}`);
  }

  let records: { address: string }[];
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new AppError('URL_UNREACHABLE', `dns lookup failed: ${hostname}`);
  }

  if (records.length === 0) {
    throw new AppError('URL_UNREACHABLE', `no dns records: ${hostname}`);
  }

  // Every address must be public: one private answer in a round-robin set is enough to abuse.
  for (const { address } of records) {
    if (isBlockedAddress(address)) {
      throw new AppError('URL_NOT_ALLOWED', `${hostname} resolves to blocked address ${address}`);
    }
  }

  return parsed;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  /** Skip host validation for a fixed, trusted first-party endpoint. */
  trustedHost?: boolean;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  /** Decoded body, truncated at `maxBytes`. */
  body: string;
  truncated: boolean;
  finalUrl: string;
}

/**
 * Fetch a user-supplied URL, following redirects by hand so each hop is
 * re-validated. Returns the body as text, capped.
 */
export async function safeFetchText(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxBytes = options.maxBytes ?? env.limits.maxFetchBytes;

  let currentUrl = options.trustedHost ? new URL(rawUrl) : await assertPublicUrl(rawUrl);
  let response: Response | undefined;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: options.headers,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const location = response.headers.get('location');
    const isRedirect = response.status >= 300 && response.status < 400 && location;
    if (!isRedirect) break;

    if (hop === MAX_REDIRECTS) {
      throw new AppError('URL_UNREACHABLE', `too many redirects from ${rawUrl}`);
    }

    const next = new URL(location, currentUrl);
    // Re-validate: an open redirect to 169.254.169.254 is the whole attack.
    currentUrl = options.trustedHost && next.host === currentUrl.host
      ? next
      : await assertPublicUrl(next.toString());
    log.debug('following redirect', { from: rawUrl, to: currentUrl.host, hop });
  }

  if (!response) {
    throw new AppError('URL_UNREACHABLE', `no response from ${rawUrl}`);
  }

  const { body, truncated } = await readCapped(response, maxBytes);

  return {
    ok: response.ok,
    status: response.status,
    body,
    truncated,
    finalUrl: currentUrl.toString(),
  };
}

/** Read a response body up to `maxBytes`, then stop pulling from the socket. */
async function readCapped(
  response: Response,
  maxBytes: number
): Promise<{ body: string; truncated: boolean }> {
  if (!response.body) return { body: '', truncated: false };

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const chunks: string[] = [];
  let total = 0;
  let truncated = false;

  try {
    while (total < maxBytes) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        const keep = value.byteLength - (total - maxBytes);
        chunks.push(decoder.decode(value.subarray(0, keep)));
        truncated = true;
        break;
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    if (!truncated) chunks.push(decoder.decode());
  } finally {
    await reader.cancel().catch(() => {});
  }

  return { body: chunks.join(''), truncated };
}

/** Download a binary resource with the same protections, capped in memory. */
export async function safeFetchBuffer(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxBytes = options.maxBytes ?? env.limits.maxFetchBytes;

  const url = options.trustedHost ? new URL(rawUrl) : await assertPublicUrl(rawUrl);

  const response = await fetch(url, {
    redirect: 'manual',
    headers: options.headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok || !response.body) {
    throw new AppError('URL_UNREACHABLE', `fetch failed (${response.status}) for ${url.host}`);
  }

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new AppError('URL_NOT_ALLOWED', `response exceeded ${maxBytes} bytes`);
      }
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  return Buffer.concat(parts);
}
