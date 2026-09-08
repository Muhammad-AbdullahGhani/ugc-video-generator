import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAssetsDir } from './assets';

const LOCAL_MEMES: Record<string, string> = {
  'mind-blown': 'mind-blown.gif',
  'brain': 'mind-blown.gif',
  'ryan': 'ryan-gosling.gif',
  'gosling': 'ryan-gosling.gif',
  'shock': 'shocked.gif',
  'surprised': 'shocked.gif',
  'wow': 'shocked.gif',
  'omg': 'shocked.gif',
  'money': 'money.gif',
  'shut up': 'money.gif',
  'buy': 'money.gif',
  'cash': 'money.gif',
  'celebrat': 'celebration.gif',
  'dance': 'celebration.gif',
  'win': 'celebration.gif',
  'party': 'celebration.gif',
  'confus': 'confused.gif',
  'math': 'confused.gif',
  'what': 'confused.gif',
};

export async function fetchReactionGif(searchTerm: string): Promise<string> {
  const assetsDir = getAssetsDir();
  const assetsGifsDir = path.join(assetsDir, 'gifs');
  const cacheDir = path.join(os.tmpdir(), 'ugc-gif-cache');

  const cleanTerm = (searchTerm || 'mind blown').toLowerCase().trim();

  // 1. Try external Giphy API if key provided
  const giphyKey = process.env.GIPHY_API_KEY;
  if (giphyKey) {
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${giphyKey}&q=${encodeURIComponent(
        cleanTerm
      )}&limit=1&rating=g`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const gifUrl =
          data.data?.[0]?.images?.downsized_medium?.url ||
          data.data?.[0]?.images?.original?.url;
        if (gifUrl) {
          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
          }
          const dest = path.join(cacheDir, `giphy_${Date.now()}.gif`);
          const gifRes = await fetch(gifUrl, { signal: AbortSignal.timeout(8000) });
          if (gifRes.ok) {
            const buf = Buffer.from(await gifRes.arrayBuffer());
            fs.writeFileSync(dest, buf);
            console.log(`[GIF] Downloaded remote Giphy GIF to ${dest}`);
            return dest;
          }
        }
      }
    } catch (err) {
      console.warn('[GIF] Giphy search failed, falling back to local library:', err);
    }
  }

  // 2. Fallback to local curated meme library
  for (const [keyword, filename] of Object.entries(LOCAL_MEMES)) {
    if (cleanTerm.includes(keyword)) {
      const localPath = path.join(assetsGifsDir, filename);
      if (fs.existsSync(localPath)) {
        console.log(`[GIF] Matched keyword "${keyword}" -> ${filename}`);
        return localPath;
      }
    }
  }

  // 3. Pick default / any available local GIF
  const defaultGif = path.join(assetsGifsDir, 'mind-blown.gif');
  if (fs.existsSync(defaultGif)) {
    return defaultGif;
  }

  // Fallback to first .gif in assetsGifsDir
  const existing = fs.readdirSync(assetsGifsDir).filter((f) => f.endsWith('.gif'));
  if (existing.length > 0) {
    return path.join(assetsGifsDir, existing[0]);
  }

  throw new Error('No reaction GIF found in /public/assets/gifs/');
}
