/**
 * Jina Reader integration (https://r.jina.ai/[URL])
 * Scrapes clean Markdown content from any public web page.
 */

export async function scrapeWebsiteMarkdown(targetUrl: string): Promise<string> {
  const jinaEndpoint = `https://r.jina.ai/${targetUrl}`;

  const response = await fetch(jinaEndpoint, {
    method: 'GET',
    headers: {
      'Accept': 'text/plain',
      'User-Agent': 'UGC-Video-Generator/1.0',
      'X-No-Cache': 'true',
    },
    signal: AbortSignal.timeout(15000), // 15-second timeout
  });

  if (!response.ok) {
    throw new Error(`Jina Reader returned status ${response.status}: ${response.statusText}`);
  }

  const markdown = await response.text();
  if (!markdown || markdown.trim().length === 0) {
    throw new Error('Received empty content from Jina Reader');
  }

  // Cap content length to ~12,000 characters to keep prompt concise and fast
  return markdown.slice(0, 12000);
}
