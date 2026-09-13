/**
 * Real Page Metadata & Social Proof Extractor
 * Extracts OG tags, meta descriptions, theme colors, and social-proof stats
 * to deeply personalize the UGC video rather than using templated copy.
 */

export interface PageMetadata {
  ogTitle?: string;
  ogDescription?: string;
  themeColor?: string;
  socialProof?: string;
  faviconUrl?: string;
}

const SOCIAL_PROOF_REGEX =
  /(?:\b(?:over|trusted by|more than|joined by)\s+)?(\d+(?:,\d+)*(?:\.\d+)?[kKmMbB]?\+?\s*(?:active\s+)?(?:users|customers|teams|companies|downloads|ratings|reviews|creators|calories\s+tracked|meals))\b|\b(4\.[6-9]|5\.0)\s*(?:stars?|\/5|out of 5)\b|\b(\d+x|\d+%\s*(?:faster|increase|growth|boost|cheaper|saved))\b/gi;

export async function extractPageMetadata(
  url: string,
  fallbackMarkdown: string = ''
): Promise<PageMetadata> {
  let html = '';
  let ogTitle: string | undefined;
  let ogDescription: string | undefined;
  let themeColor: string | undefined;
  let socialProof: string | undefined;
  let faviconUrl: string | undefined;

  // 1. Attempt fast direct HTML fetch (3.5s timeout)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      html = await res.text();
    }
  } catch (err) {
    console.warn(`[MetadataExtractor] Direct HTML fetch timed out or blocked for ${url}:`, err);
  }

  // 2. Parse from HTML if available
  if (html) {
    // Title
    const ogTitleMatch =
      html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    ogTitle = ogTitleMatch?.[1] || titleMatch?.[1]?.trim();

    // Description
    const ogDescMatch =
      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    ogDescription = ogDescMatch?.[1]?.trim();

    // Theme Color (brand color)
    const themeMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
    if (themeMatch && themeMatch[1]) {
      const rawColor = themeMatch[1].trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(rawColor)) {
        themeColor = rawColor;
      }
    }

    // Favicon
    const iconMatch =
      html.match(/<link\s+[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut\s+)?icon["']/i);
    if (iconMatch?.[1]) {
      const href = iconMatch[1];
      try {
        faviconUrl = new URL(href, url).toString();
      } catch {
        // Ignore malformed favicon url
      }
    }

    // Social proof scan from HTML
    const socialMatches = Array.from(html.matchAll(SOCIAL_PROOF_REGEX));
    if (socialMatches.length > 0) {
      // Pick the cleanest match
      const candidates = socialMatches.map((m) => m[0].trim()).filter((s) => s.length > 3 && s.length < 50);
      if (candidates.length > 0) {
        socialProof = candidates[0];
      }
    }
  }

  // 3. Fallback to scraping Markdown (from Jina Reader)
  if (!ogTitle && fallbackMarkdown) {
    const headingMatch = fallbackMarkdown.match(/^#\s+(.+)$/m) || fallbackMarkdown.match(/Title:\s*(.+)$/m);
    if (headingMatch) {
      ogTitle = headingMatch[1].trim();
    }
  }

  if (!socialProof && fallbackMarkdown) {
    const mdMatches = Array.from(fallbackMarkdown.matchAll(SOCIAL_PROOF_REGEX));
    if (mdMatches.length > 0) {
      const candidates = mdMatches.map((m) => m[0].trim()).filter((s) => s.length > 3 && s.length < 50);
      if (candidates.length > 0) {
        socialProof = candidates[0];
      }
    }
  }

  return {
    ogTitle,
    ogDescription,
    themeColor,
    socialProof,
    faviconUrl,
  };
}
