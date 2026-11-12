import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getAssetsDir, MemeMood, MOOD_POOLS, pickRandomAsset } from './assets';
import { env } from './env';
import { AppError } from './errors';
import { createLogger } from './logger';
import { safeFetchBuffer } from './safe-fetch';

const log = createLogger('gif');

/** Giphy GIFs are decorative; a few MB is plenty and bounds the memory cost. */
const MAX_GIF_BYTES = 4 * 1024 * 1024;
const GIF_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const LOCAL_MEMES: Record<string, string> = {
  'mind-blown': 'mind-blown.gif',
  'mind blown': 'mind-blown.gif',
  mind: 'mind-blown.gif',
  brain: 'mind-blown.gif',
  genius: 'mind-blown.gif',
  'focused-nod': 'focused-nod.gif',
  'focused nod': 'focused-nod.gif',
  nod: 'focused-nod.gif',
  nodding: 'focused-nod.gif',
  'thumbs up': 'focused-nod.gif',
  approval: 'focused-nod.gif',
  dev: 'focused-nod.gif',
  code: 'focused-nod.gif',
  engineer: 'focused-nod.gif',
  typing: 'typing-fast.gif',
  hacker: 'typing-fast.gif',
  keyboard: 'typing-fast.gif',
  shocked: 'shocked.gif',
  shock: 'shocked.gif',
  surprised: 'shocked.gif',
  wow: 'shocked.gif',
  omg: 'shocked.gif',
  disbelief: 'shocked.gif',
  money: 'money.gif',
  'shut up': 'money.gif',
  'take my money': 'money.gif',
  buy: 'money.gif',
  cash: 'money.gif',
  dollar: 'money.gif',
  revenue: 'money.gif',
  roi: 'money.gif',
  celebration: 'celebration.gif',
  celebrat: 'celebration.gif',
  dance: 'celebration.gif',
  win: 'celebration.gif',
  party: 'celebration.gif',
  fitness: 'celebration.gif',
  workout: 'celebration.gif',
  gains: 'celebration.gif',
  confused: 'confused.gif',
  confus: 'confused.gif',
  math: 'confused.gif',
  what: 'confused.gif',
  question: 'confused.gif',
  complex: 'confused.gif',
};

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function cacheDir(): string {
  return path.join(os.tmpdir(), 'ugc-gif-cache');
}

let lastSweep = 0;

/** The cache wrote one timestamped file per request and never deleted any. */
async function sweepGifCache(): Promise<void> {
  const now = Date.now();
  if (now - lastSweep < 60 * 60_000) return;
  lastSweep = now;

  try {
    const dir = cacheDir();
    for (const name of await fs.readdir(/* turbopackIgnore: true */ dir)) {
      const target = path.join(dir, name);
      try {
        const info = await fs.stat(target);
        if (now - info.mtimeMs > GIF_CACHE_TTL_MS) await fs.unlink(target);
      } catch {
        // raced with another sweep
      }
    }
  } catch {
    // cache dir may not exist yet
  }
}

async function fetchFromGiphy(query: string): Promise<string | null> {
  if (!env.giphy.apiKey) return null;

  try {
    const searchUrl = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(
      env.giphy.apiKey
    )}&q=${encodeURIComponent(query)}&limit=1&rating=g`;

    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      data?: Array<{ images?: Record<string, { url?: string }> }>;
    };
    const gifUrl =
      data.data?.[0]?.images?.downsized_medium?.url ?? data.data?.[0]?.images?.original?.url;
    if (!gifUrl) return null;

    // Giphy returns a CDN URL we did not choose — validate it like any other
    // remote address and cap the download.
    const buffer = await safeFetchBuffer(gifUrl, {
      timeoutMs: 8_000,
      maxBytes: MAX_GIF_BYTES,
    });

    const dir = cacheDir();
    await fs.mkdir(dir, { recursive: true });
    const dest = path.join(dir, `giphy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.gif`);
    await fs.writeFile(dest, buffer);

    log.debug('cached a giphy result', { query, bytes: buffer.length });
    return dest;
  } catch (err) {
    log.warn('giphy lookup failed, using the local library', { err: err as Error });
    return null;
  }
}

/**
 * Resolve a reaction GIF path. Remote first when a key is configured, then the
 * bundled library, which always wins over failing the render.
 */
export async function fetchReactionGif(searchTerm: string, mood?: MemeMood): Promise<string> {
  void sweepGifCache();

  const assetsGifsDir = path.join(await getAssetsDir(), 'gifs');
  const cleanTerm = (searchTerm || 'mind blown').toLowerCase().trim();
  const moodConfig = mood ? MOOD_POOLS[mood] : undefined;

  const remote = await fetchFromGiphy(moodConfig ? moodConfig.giphySearch : cleanTerm);
  if (remote) return remote;

  // Derived filename, basename-guarded: the term reaches us from the model.
  const directName = path.basename(`${cleanTerm.replace(/[^a-z0-9]+/g, '-')}.gif`);
  const direct = path.join(assetsGifsDir, directName);
  if (await exists(direct)) {
    log.debug('matched gif by filename', { term: cleanTerm, file: directName });
    return direct;
  }

  if (moodConfig?.gifs.length) {
    const matched = moodConfig.gifs.find((g) =>
      cleanTerm.includes(g.replace('.gif', '').replace('-', ' '))
    );
    const chosen = matched ?? pickRandomAsset(moodConfig.gifs, moodConfig.gifs[0]);
    const moodPath = path.join(assetsGifsDir, chosen);
    if (await exists(moodPath)) return moodPath;
  }

  for (const [keyword, filename] of Object.entries(LOCAL_MEMES)) {
    if (cleanTerm.includes(keyword)) {
      const localPath = path.join(assetsGifsDir, filename);
      if (await exists(localPath)) return localPath;
    }
  }

  const defaultGif = path.join(assetsGifsDir, 'mind-blown.gif');
  if (await exists(defaultGif)) return defaultGif;

  const anyGif = (await fs.readdir(assetsGifsDir).catch(() => [] as string[])).find((f) =>
    f.endsWith('.gif')
  );
  if (anyGif) return path.join(assetsGifsDir, anyGif);

  throw new AppError('ASSET_UNAVAILABLE', 'no reaction gif found in public/assets/gifs');
}
