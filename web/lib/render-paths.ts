/**
 * Where renders live, and how they are reaped.
 *
 * Kept separate from the compositor so the streaming route can resolve a path
 * without importing FFmpeg, the storage client, and the Gemini-adjacent graph
 * behind them.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { env } from './env';
import { createLogger } from './logger';

const log = createLogger('renders');

let rendersDirCache: string | null = null;

export async function getRendersDir(): Promise<string> {
  if (rendersDirCache) return rendersDirCache;

  if (!env.isServerless) {
    // Deliberately NOT under public/: anything in public/ is served statically by
    // Next at its own path, which would hand out every render at
    // /renders/<file>.mp4 and bypass the signature check on /api/video/[filename].
    const local = path.join(process.cwd(), '.data', 'renders');
    try {
      await fs.mkdir(local, { recursive: true });
      rendersDirCache = local;
      return local;
    } catch {
      // read-only project directory: fall through to the temp dir
    }
  }

  const temp = path.join(os.tmpdir(), 'renders');
  await fs.mkdir(temp, { recursive: true });
  rendersDirCache = temp;
  return temp;
}

let lastSweep = 0;

/**
 * Delete renders past the retention window. Without this the directory grows
 * until the disk fills — on a long-lived host, a matter of days.
 */
export async function sweepOldRenders(): Promise<number> {
  const now = Date.now();
  if (now - lastSweep < 10 * 60_000) return 0;
  lastSweep = now;

  const dir = await getRendersDir();
  let removed = 0;

  try {
    const entries = await fs.readdir(/* turbopackIgnore: true */ dir);
    for (const name of entries) {
      if (name === '.gitkeep') continue;
      const target = path.join(/* turbopackIgnore: true */ dir, name);
      try {
        const info = await fs.stat(target);
        if (now - info.mtimeMs > env.render.retentionMs) {
          await fs.unlink(target);
          removed++;
        }
      } catch {
        // raced with another sweep or a delete
      }
    }
  } catch (err) {
    log.warn('render sweep failed', { err: err as Error });
  }

  if (removed > 0) log.info('swept expired renders', { removed });
  return removed;
}
