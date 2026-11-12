/**
 * Detect a product URL inside free-form user text.
 *
 * This only finds a *candidate*. It deliberately does not decide whether the URL
 * is safe to fetch — that is `assertPublicUrl()` in `lib/safe-fetch.ts`, which
 * resolves DNS and rejects private addresses. Keep the two separate: a syntactic
 * check can never prove a host is public.
 */

const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>()]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:app|ai|com|org|net|io|co|dev|tech|xyz|me|so|to|sh|gg|page|site|store|agency|online)(?:\/[^\s<>()]*)?/gi;

/** Longest URL we will consider: anything beyond this is noise or an attack. */
const MAX_URL_LENGTH = 2_048;

export function extractUrl(text: string): string | null {
  if (!text) return null;

  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0) return null;

  for (const match of matches) {
    const candidate = normalize(match);
    if (candidate) return candidate;
  }

  return null;
}

function normalize(match: string): string | null {
  let candidate = match.replace(/[.,!?;:)\s]+$/, '');
  if (candidate.length > MAX_URL_LENGTH) return null;

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    // Embedded credentials are a redirect-laundering trick, not a product page.
    if (parsed.username || parsed.password) return null;

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    if (!hostname) return null;

    // Obvious local targets are rejected up front; the real check still happens
    // at fetch time, where DNS can be resolved.
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
      return null;
    }
    if (!hostname.includes('.') && !hostname.includes(':')) return null;

    return parsed.toString();
  } catch {
    return null;
  }
}
