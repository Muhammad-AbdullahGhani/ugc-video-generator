/**
 * Helper to detect and extract product/website URLs from user input.
 * Handles explicit protocols (https://), www prefixes, and bare domains (e.g., calai.app, product.io).
 */

const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>()]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:app|ai|com|org|net|io|co|dev|tech|xyz|me|so|to|sh|gg|page|site|store|agency|online)(?:\/[^\s<>()]*)?/gi;

export function extractUrl(text: string): string | null {
  if (!text) return null;

  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0) {
    return null;
  }

  // Pick first candidate and trim trailing punctuation like . , ! ? ) ]
  let candidate = matches[0].replace(/[.,!?;:)\s]+$/, '');

  // Normalize protocol
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    // Basic sanity check on hostname
    if (parsed.hostname && parsed.hostname.includes('.')) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}
