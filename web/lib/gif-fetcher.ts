import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAssetsDir, MemeMood, MOOD_POOLS, pickRandomAsset } from './assets';

const LOCAL_MEMES: Record<string, string> = {
  'mind-blown': 'mind-blown.gif',
  'mind blown': 'mind-blown.gif',
  'mind': 'mind-blown.gif',
  'brain': 'mind-blown.gif',
  'genius': 'mind-blown.gif',
  'ryan-gosling': 'ryan-gosling.gif',
  'ryan gosling': 'ryan-gosling.gif',
  'ryan': 'ryan-gosling.gif',
  'gosling': 'ryan-gosling.gif',
  'dev': 'ryan-gosling.gif',
  'code': 'ryan-gosling.gif',
  'engineer': 'ryan-gosling.gif',
  'nod': 'ryan-gosling.gif',
  'shocked': 'shocked.gif',
  'shock': 'shocked.gif',
  'surprised': 'shocked.gif',
  'wow': 'shocked.gif',
  'omg': 'shocked.gif',
  'disbelief': 'shocked.gif',
  'money': 'money.gif',
  'shut up': 'money.gif',
  'take my money': 'money.gif',
  'buy': 'money.gif',
  'cash': 'money.gif',
  'dollar': 'money.gif',
  'revenue': 'money.gif',
  'roi': 'money.gif',
  'celebration': 'celebration.gif',
  'celebrat': 'celebration.gif',
  'dance': 'celebration.gif',
  'win': 'celebration.gif',
  'party': 'celebration.gif',
  'fitness': 'celebration.gif',
  'workout': 'celebration.gif',
  'gains': 'celebration.gif',
  'confused': 'confused.gif',
  'confus': 'confused.gif',
  'math': 'confused.gif',
  'what': 'confused.gif',
  'question': 'confused.gif',
  'complex': 'confused.gif',
};

export async function fetchReactionGif(searchTerm: string, mood?: MemeMood): Promise<string> {
  const assetsDir = getAssetsDir();
  const assetsGifsDir = path.join(assetsDir, 'gifs');
  const cacheDir = path.join(os.tmpdir(), 'ugc-gif-cache');

  const cleanTerm = (searchTerm || 'mind blown').toLowerCase().trim();
  const moodConfig = mood ? MOOD_POOLS[mood] : undefined;

  // 1. Try external Giphy API if key provided (using mood query or search term)
  const giphyKey = process.env.GIPHY_API_KEY;
  if (giphyKey) {
    try {
      const query = moodConfig ? moodConfig.giphySearch : cleanTerm;
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${giphyKey}&q=${encodeURIComponent(
        query
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

  // 2. Direct filename candidate
  const directCandidate = path.join(assetsGifsDir, `${cleanTerm.replace(/[^a-z0-9]+/g, '-')}.gif`);
  if (fs.existsSync(directCandidate)) {
    console.log(`[GIF] Matched direct filename "${cleanTerm}" -> ${path.basename(directCandidate)}`);
    return directCandidate;
  }

  // 3. Fallback within Mood pool if mood provided
  if (moodConfig && moodConfig.gifs.length > 0) {
    // Check if cleanTerm matches any specific gif in the mood pool
    const matchedMoodGif = moodConfig.gifs.find((g) =>
      cleanTerm.includes(g.replace('.gif', '').replace('-', ' '))
    );
    const chosenName = matchedMoodGif || pickRandomAsset(moodConfig.gifs, moodConfig.gifs[0]);
    const moodPath = path.join(assetsGifsDir, chosenName);
    if (fs.existsSync(moodPath)) {
      console.log(`[GIF] Selected mood "${mood}" GIF -> ${chosenName}`);
      return moodPath;
    }
  }

  // 4. Fallback to local curated meme library keywords
  for (const [keyword, filename] of Object.entries(LOCAL_MEMES)) {
    if (cleanTerm.includes(keyword)) {
      const localPath = path.join(assetsGifsDir, filename);
      if (fs.existsSync(localPath)) {
        console.log(`[GIF] Matched keyword "${keyword}" -> ${filename}`);
        return localPath;
      }
    }
  }

  // 5. Pick default / any available local GIF
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
