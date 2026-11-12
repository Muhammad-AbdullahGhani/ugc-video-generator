import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND_COLOR,
  isValidRenderFilename,
  normalizeHexColor,
  parseRangeHeader,
  sanitizeHookText,
  sanitizePlainText,
} from '@/lib/validators';

describe('normalizeHexColor', () => {
  it('accepts plain and hash-prefixed six-digit hex', () => {
    expect(normalizeHexColor('#1E90FF')).toBe('1E90FF');
    expect(normalizeHexColor('1e90ff')).toBe('1E90FF');
  });

  it('expands three-digit shorthand', () => {
    expect(normalizeHexColor('#0af')).toBe('00AAFF');
  });

  it('drops an alpha byte', () => {
    expect(normalizeHexColor('#1E90FFCC')).toBe('1E90FF');
  });

  it('rejects six characters that are not hex', () => {
    // The original bug: `length === 6` passed this straight into the filter graph,
    // where the semicolons terminate a filter clause.
    expect(normalizeHexColor('aa;bb;')).toBe(DEFAULT_BRAND_COLOR);
    expect(normalizeHexColor("';x=1'")).toBe(DEFAULT_BRAND_COLOR);
    expect(normalizeHexColor('ggghhh')).toBe(DEFAULT_BRAND_COLOR);
  });

  it('rejects non-strings and empty input', () => {
    expect(normalizeHexColor(undefined)).toBe(DEFAULT_BRAND_COLOR);
    expect(normalizeHexColor(null)).toBe(DEFAULT_BRAND_COLOR);
    expect(normalizeHexColor({ toString: () => 'FF0000' })).toBe(DEFAULT_BRAND_COLOR);
    expect(normalizeHexColor('')).toBe(DEFAULT_BRAND_COLOR);
  });

  it('falls back when the colour is too dark to read against footage', () => {
    expect(normalizeHexColor('#000000')).toBe(DEFAULT_BRAND_COLOR);
    expect(normalizeHexColor('#0a0a0a')).toBe(DEFAULT_BRAND_COLOR);
  });
});

describe('sanitizeHookText', () => {
  it('collapses whitespace and trims', () => {
    expect(sanitizeHookText('  Ship   faster\n\nnow  ')).toBe('Ship faster now');
  });

  it('strips control characters', () => {
    // Built from code points so this file carries no raw control bytes.
    const NUL = String.fromCharCode(0);
    const ESC = String.fromCharCode(27);
    // Each control char becomes a space, then runs of whitespace collapse.
    expect(sanitizeHookText(`Ship${NUL} fast${ESC}[31m`)).toBe('Ship fast [31m');
    expect(sanitizeHookText(`a${NUL}${NUL}${NUL}b`)).toBe('a b');
  });

  it('caps length', () => {
    expect(sanitizeHookText('x'.repeat(500))?.length).toBe(140);
  });

  it('returns null for unusable input', () => {
    expect(sanitizeHookText('')).toBeNull();
    expect(sanitizeHookText('  ')).toBeNull();
    expect(sanitizeHookText('ab')).toBeNull();
    expect(sanitizeHookText(42)).toBeNull();
  });
});

describe('sanitizePlainText', () => {
  it('bounds length and returns null when empty', () => {
    expect(sanitizePlainText('hello', 10)).toBe('hello');
    expect(sanitizePlainText('hello world', 5)).toBe('hello');
    expect(sanitizePlainText('   ', 10)).toBeNull();
    expect(sanitizePlainText(undefined, 10)).toBeNull();
  });
});

describe('isValidRenderFilename', () => {
  it('accepts filenames this app produces', () => {
    expect(isValidRenderFilename('ugc_1731340000000_a1b2c.mp4')).toBe(true);
  });

  it('rejects traversal, other extensions and foreign names', () => {
    expect(isValidRenderFilename('../../etc/passwd')).toBe(false);
    expect(isValidRenderFilename('ugc_123.txt')).toBe(false);
    expect(isValidRenderFilename('secret.mp4')).toBe(false);
    expect(isValidRenderFilename('ugc_.mp4')).toBe(false);
  });
});

describe('parseRangeHeader', () => {
  const size = 1_000;

  it('returns null when there is no range', () => {
    expect(parseRangeHeader(null, size)).toBeNull();
  });

  it('parses a closed range', () => {
    expect(parseRangeHeader('bytes=0-499', size)).toEqual({ start: 0, end: 499 });
  });

  it('parses an open-ended range', () => {
    expect(parseRangeHeader('bytes=500-', size)).toEqual({ start: 500, end: 999 });
  });

  it('parses a suffix range', () => {
    expect(parseRangeHeader('bytes=-200', size)).toEqual({ start: 800, end: 999 });
  });

  it('clamps an end past the file size', () => {
    expect(parseRangeHeader('bytes=900-99999', size)).toEqual({ start: 900, end: 999 });
  });

  it('reports unsatisfiable rather than producing NaN', () => {
    // These used to reach createReadStream and surface as a 500.
    expect(parseRangeHeader('bytes=abc-', size)).toBe('unsatisfiable');
    expect(parseRangeHeader('bytes=-', size)).toBe('unsatisfiable');
    expect(parseRangeHeader('bytes=5000-6000', size)).toBe('unsatisfiable');
    expect(parseRangeHeader('bytes=600-500', size)).toBe('unsatisfiable');
    expect(parseRangeHeader('items=0-10', size)).toBe('unsatisfiable');
    expect(parseRangeHeader('bytes=0-10, 20-30', size)).toBe('unsatisfiable');
  });
});
