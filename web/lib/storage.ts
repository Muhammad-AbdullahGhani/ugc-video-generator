import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { put } from '@vercel/blob';
import { env } from './env';
import { AppError } from './errors';
import { createLogger } from './logger';
import { signVideoPath } from './signed-url';

const log = createLogger('storage');

/**
 * Persist a rendered video and return the URL the client should play.
 *
 * Two paths, both under our control:
 *   1. Vercel Blob when a token is configured (required in production).
 *   2. A signed, locally served URL for development.
 *
 * There is deliberately no third-party fallback. The previous implementation
 * uploaded every user's video to catbox.moe — an anonymous public file host — on
 * a permanent URL that cannot be deleted and is covered by no agreement. "Zero
 * config" is not worth publishing a customer's unreleased marketing asset.
 */
export async function storeVideo(filePath: string, filename: string): Promise<string> {
  if (env.storage.configured) {
    try {
      const { size } = await stat(filePath);
      log.info('uploading to blob storage', { filename, size });

      // Stream rather than buffer: a readFileSync here costs one full video of
      // heap per concurrent render.
      const blob = await put(`videos/${filename}`, createReadStream(filePath), {
        access: 'public',
        contentType: 'video/mp4',
        token: env.storage.blobToken,
      });

      log.info('blob upload complete', { filename, url: blob.url });
      return blob.url;
    } catch (err) {
      // In production there is nowhere else to go, and silently degrading to a
      // worse location is how data ends up somewhere nobody chose.
      throw new AppError('STORAGE_FAILED', `blob upload failed for ${filename}`, err);
    }
  }

  if (env.isProduction) {
    // Unreachable: lib/env.ts refuses to boot a production build without a token.
    throw new AppError('STORAGE_FAILED', 'no storage backend configured in production');
  }

  // Development: serve from the local render directory behind an HMAC-signed URL
  // so the file is not readable by anyone who can guess a filename.
  log.info('serving render locally (development)', { filename });
  return signVideoPath(filename);
}
