/**
 * Real Page Metadata & Social Proof Extractor
 *
 * Extracts OG tags, meta descriptions, theme colors, and social-proof stats to
 * personalize the UGC video rather than using templated copy.
 *
 * Everything here parses attacker-controlled HTML, so every extracted value is
 * treated as untrusted: the fetch goes through `safeFetchText` (SSRF guards +
 * byte cap) and each field is length-bounded and shape-checked before it is
 * returned. `themeColor` in particular reaches an FFmpeg filter graph later, so
 * it is validated as strict hex here and again at the point of use.
 */

import { assertPublicUrl, safeFetchText } from './safe-fetch';
import { createLogger } from './logger';
import { AppError } from './errors';

const log = createLogger('metadata');

export interface PageMetadata {
  ogTitle?: string;
  ogDescription?: string;
  themeColor?: string;
  socialProof?: string;
  faviconUrl?: string;
}

const SOCIAL_PROOF_REGEX =
  /(?:\b(?:over|trusted by|more than|joined by)\s+)?(\d+(?:,\d+)*(?:\.\d+)?[kKmMbB]?\+?\s*(?:active\s+)?(?:users|customers|teams|companies|downloads|ratings|reviews|creators|calories\s+tracked|meals))\b|\b(4\.[6-9]|5\.0)\s*(?:stars?|\/5|out of 5)\b|\b(\d+x|\d+%\s*(?:faster|increase|growth|boost|cheaper|saved))\b/gi;

const MAX_TITLE_CHARS = 120;
const MAX_DESCRIPTION_CHARS = 400;
const MAX_SOCIAL_PROOF_CHARS = 50;

/** Only ever accept a strict 3/6/8-digit hex colour. */
const HEX_COLOR = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$/;

/** Collapse whitespace, decode the handful of entities that matter, bound length. */
function clean(value: string | undefined, maxChars: number): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maxChars);
}

export async function extractPageMetadata(
  url: string,
  fallbackMarkdown: string = ''
): Promise<PageMetadata> {
  let html = '';

  try {
    const validated = await assertPublicUrl(url);
    const result = await safeFetchText(validated.toString(), {
      timeoutMs: 3_500,
      maxBytes: 1024 * 1024, // metadata lives in <head>; 1 MB is generous
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (result.ok) html = result.body;
  } catch (err) {
    // A blocked or unreachable page is normal here — Jina is the other half of
    // the pair and may still succeed. Only re-throw an explicit policy refusal.
    if (err instanceof AppError && err.code === 'URL_NOT_ALLOWED') throw err;
    log.debug('direct html fetch failed, continuing with markdown fallback', {
      url,
      err: err as Error,
    });
  }

  const meta: PageMetadata = {};

  if (html) {
    const ogTitleMatch =
      html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    meta.ogTitle = clean(ogTitleMatch?.[1] ?? titleMatch?.[1], MAX_TITLE_CHARS);

    const ogDescMatch =
      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    meta.ogDescription = clean(ogDescMatch?.[1], MAX_DESCRIPTION_CHARS);

    const themeMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
    const rawColor = themeMatch?.[1]?.trim();
    if (rawColor && HEX_COLOR.test(rawColor)) {
      meta.themeColor = rawColor;
    }

    const iconMatch =
      html.match(/<link\s+[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut\s+)?icon["']/i);
    if (iconMatch?.[1]) {
      try {
        const favicon = new URL(iconMatch[1], url);
        if (favicon.protocol === 'https:' || favicon.protocol === 'http:') {
          meta.faviconUrl = favicon.toString();
        }
      } catch {
        // Malformed favicon href: not worth reporting.
      }
    }

    meta.socialProof = firstSocialProof(html);
  }

  if (!meta.ogTitle && fallbackMarkdown) {
    const headingMatch =
      fallbackMarkdown.match(/^#\s+(.+)$/m) || fallbackMarkdown.match(/Title:\s*(.+)$/m);
    meta.ogTitle = clean(headingMatch?.[1], MAX_TITLE_CHARS);
  }

  if (!meta.socialProof && fallbackMarkdown) {
    meta.socialProof = firstSocialProof(fallbackMarkdown);
  }

  return meta;
}

function firstSocialProof(source: string): string | undefined {
  // Reset lastIndex: the regex is module-level and /g is stateful.
  SOCIAL_PROOF_REGEX.lastIndex = 0;
  for (const match of source.matchAll(SOCIAL_PROOF_REGEX)) {
    const candidate = clean(match[0], MAX_SOCIAL_PROOF_CHARS);
    if (candidate && candidate.length > 3) return candidate;
  }
  return undefined;
}
