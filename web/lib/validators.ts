/**
 * Validation for values that cross a trust boundary.
 *
 * Two sources feed these: scraped page HTML and LLM output. Both are
 * attacker-influenceable, and both reach sinks that care — an FFmpeg filter
 * graph, a filename, a rendered frame. Checking a string's *length* is not
 * checking its *contents*; these functions check contents.
 */

import { PRODUCT_CATEGORIES, ProductCategory } from './assets';

/** Exactly six hex digits, no `#`. The form FFmpeg's `0xRRGGBB` needs. */
export const HEX6 = /^[0-9a-fA-F]{6}$/;

export const DEFAULT_BRAND_COLOR = 'FF6B00'; // Electric Amber

/**
 * Normalize an arbitrary colour string to six hex digits, or fall back.
 *
 * The previous implementation only checked `length === 6`, which happily passed
 * `aa;bb;` straight into the filter graph and let a scraped page terminate a
 * filter clause.
 */
export function normalizeHexColor(input: unknown, fallback = DEFAULT_BRAND_COLOR): string {
  if (typeof input !== 'string') return fallback;

  let value = input.trim().replace(/^#/, '');

  // Expand #abc shorthand.
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }

  // Drop an alpha byte if present.
  if (/^[0-9a-fA-F]{8}$/.test(value)) {
    value = value.slice(0, 6);
  }

  if (!HEX6.test(value)) return fallback;

  // Near-black loses the text border against dark footage.
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (luminance < 0.25) return fallback;

  return value.toUpperCase();
}

/**
 * Replace C0 and C1 control characters with a space.
 *
 * Written as a code-point scan rather than a regex so the source carries no
 * escape sequences: ANSI escapes and NULs reaching a drawtext file or a log line
 * are the thing being removed, and they should not appear in this file either.
 */
function stripControlChars(input: string): string {
  let out = '';
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;
    const isControl = code < 0x20 || (code >= 0x7f && code <= 0x9f);
    out += isControl ? ' ' : char;
  }
  return out;
}

export const MAX_HOOK_CHARS = 140;

/**
 * Clean a model-authored hook line for use as on-screen text.
 * Returns null when nothing usable survives, so the caller can fall back.
 */
export function sanitizeHookText(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  const cleaned = stripControlChars(input)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_HOOK_CHARS);

  return cleaned.length >= 3 ? cleaned : null;
}

/** Free text destined only for the chat transcript, never for a shell or filter. */
export function sanitizePlainText(input: unknown, maxChars: number): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = stripControlChars(input).replace(/\s+/g, ' ').trim().slice(0, maxChars);
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeCategory(input: unknown): ProductCategory {
  if (typeof input === 'string') {
    const candidate = input.trim().toLowerCase();
    if ((PRODUCT_CATEGORIES as readonly string[]).includes(candidate)) {
      return candidate as ProductCategory;
    }
  }
  return 'general';
}

/** Render output filenames: `ugc_<base36>.mp4`, nothing else is served. */
export const RENDER_FILENAME = /^ugc_[a-z0-9_]{8,64}\.mp4$/;

export function isValidRenderFilename(name: string): boolean {
  return RENDER_FILENAME.test(name);
}

export interface ParsedRange {
  start: number;
  end: number;
}

/**
 * Parse a single-range HTTP `Range` header against a known file size.
 *
 * Returns `null` for "no range, send the whole file" and `'unsatisfiable'` for a
 * range that must be answered with 416. The previous code ran `parseInt` straight
 * into `createReadStream`, so `Range: bytes=abc-` became a 500.
 */
export function parseRangeHeader(
  header: string | null,
  fileSize: number
): ParsedRange | null | 'unsatisfiable' {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return 'unsatisfiable';

  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return 'unsatisfiable';

  let start: number;
  let end: number;

  if (rawStart === '') {
    // Suffix form: `bytes=-500` means the last 500 bytes.
    const suffixLength = Number.parseInt(rawEnd, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return 'unsatisfiable';
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else {
    start = Number.parseInt(rawStart, 10);
    end = rawEnd === '' ? fileSize - 1 : Number.parseInt(rawEnd, 10);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'unsatisfiable';
  if (start < 0 || start >= fileSize) return 'unsatisfiable';

  end = Math.min(end, fileSize - 1);
  if (end < start) return 'unsatisfiable';

  return { start, end };
}
