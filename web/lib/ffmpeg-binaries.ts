/**
 * Resolution of the FFmpeg and ffprobe binaries.
 *
 * Separate from the compositor so a health check can ask "is verification
 * possible here?" without importing the render pipeline.
 */

import { env } from './env';
import { createLogger } from './logger';

const log = createLogger('ffmpeg');

let ffmpegPathCache: string | null = null;
let ffprobePathCache: string | null | undefined;

export function getFfmpegPath(): string {
  if (ffmpegPathCache) return ffmpegPathCache;

  if (env.render.ffmpegPath) {
    ffmpegPathCache = env.render.ffmpegPath;
    return ffmpegPathCache;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (typeof installer?.path === 'string') {
      ffmpegPathCache = installer.path;
      return installer.path;
    }
  } catch (err) {
    log.warn('@ffmpeg-installer lookup failed, falling back to PATH', { err: err as Error });
  }

  ffmpegPathCache = 'ffmpeg';
  return ffmpegPathCache;
}

/**
 * Resolve ffprobe, or null when it genuinely is not available.
 *
 * `@ffmpeg-installer/ffmpeg` ships *only* ffmpeg. The previous code shelled out
 * to a bare `ffprobe`, which does not exist in most deploy images — and the
 * catch block then returned plausible-looking numbers, so the UI reported a
 * verification that never ran. Returning null instead lets callers say
 * "unverified" honestly.
 */
export function getFfprobePath(): string | null {
  if (ffprobePathCache !== undefined) return ffprobePathCache;

  if (env.render.ffprobePath) {
    ffprobePathCache = env.render.ffprobePath;
    return ffprobePathCache;
  }

  let resolved: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require('@ffprobe-installer/ffprobe');
    resolved = typeof installer?.path === 'string' ? installer.path : null;
  } catch {
    log.warn('ffprobe is not installed — renders will be reported as unverified');
  }

  ffprobePathCache = resolved;
  return resolved;
}
