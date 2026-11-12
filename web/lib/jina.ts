/**
 * Jina Reader integration (https://r.jina.ai/[URL])
 * Scrapes clean Markdown content from a public web page.
 *
 * The target URL is validated before it is handed to Jina — a reader service is
 * still a fetch of a user-supplied address, just performed by someone else, and
 * we do not want to launder a request to an internal host through it.
 */

import { AppError } from './errors';
import { assertPublicUrl, safeFetchText } from './safe-fetch';
import { createLogger } from './logger';

const log = createLogger('jina');

/** Enough context for the model; more only costs tokens and latency. */
const MAX_MARKDOWN_CHARS = 12_000;

export async function scrapeWebsiteMarkdown(targetUrl: string): Promise<string> {
  const validated = await assertPublicUrl(targetUrl);
  const endpoint = `https://r.jina.ai/${validated.toString()}`;

  const result = await safeFetchText(endpoint, {
    // r.jina.ai is a fixed, trusted first-party endpoint; the *target* was
    // validated above.
    trustedHost: true,
    timeoutMs: 15_000,
    maxBytes: 512 * 1024,
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'UGC-Video-Generator/1.0',
      'X-No-Cache': 'true',
    },
  });

  if (!result.ok) {
    throw new AppError('URL_UNREACHABLE', `jina reader returned ${result.status} for ${validated.host}`);
  }

  if (!result.body.trim()) {
    throw new AppError('PAGE_TOO_THIN', `jina reader returned an empty body for ${validated.host}`);
  }

  log.debug('scraped page', { host: validated.host, chars: result.body.length });
  return result.body.slice(0, MAX_MARKDOWN_CHARS);
}
