import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';
import { getRendersDir } from '@/lib/render-paths';
import { verifyVideoSignature } from '@/lib/signed-url';
import { isValidRenderFilename, parseRangeHeader } from '@/lib/validators';
import { createLogger, newRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('api:video');

/**
 * Serve a locally rendered video.
 *
 * Access control is an HMAC signature, not filename obscurity: this directory is
 * shared by every render, so without a signature anyone who guesses a name can
 * read someone else's video. Production serves from blob storage and never
 * reaches this route.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const requestId = newRequestId();

  try {
    const { filename } = await params;
    // basename blocks traversal; the pattern check means only files this app
    // names can ever be addressed.
    const cleanFilename = path.basename(filename);

    if (!isValidRenderFilename(cleanFilename)) {
      return new NextResponse('Invalid video request', { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    if (!verifyVideoSignature(cleanFilename, searchParams.get('exp'), searchParams.get('sig'))) {
      log.warn('rejected an unsigned or expired video request', { requestId, cleanFilename });
      return new NextResponse('Not found', { status: 404 });
    }

    const targetPath = path.join(await getRendersDir(), cleanFilename);

    let fileSize: number;
    try {
      const info = await stat(targetPath);
      if (!info.isFile()) throw new Error('not a file');
      fileSize = info.size;
    } catch {
      return new NextResponse('Video not found', { status: 404 });
    }

    const range = parseRangeHeader(req.headers.get('range'), fileSize);

    if (range === 'unsatisfiable') {
      // A malformed or out-of-bounds range is a 416, not a 500.
      return new NextResponse('Range Not Satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' },
      });
    }

    const start = range?.start ?? 0;
    const end = range?.end ?? fileSize - 1;
    const length = end - start + 1;

    // Readable.toWeb preserves backpressure. Bridging by hand with
    // `on('data', enqueue)` buffers the whole file for a slow client.
    const body = Readable.toWeb(
      createReadStream(targetPath, { start, end })
    ) as unknown as ReadableStream<Uint8Array>;

    const headers: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Content-Length': String(length),
      'Accept-Ranges': 'bytes',
      // Private: a signed URL is per-user, so a shared cache must not keep it.
      'Cache-Control': 'private, max-age=3600',
      'X-Request-Id': requestId,
    };

    if (range) {
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
      return new NextResponse(body, { status: 206, headers });
    }

    return new NextResponse(body, { status: 200, headers });
  } catch (err) {
    log.error('failed to serve a video', { requestId, err: err as Error });
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: { 'X-Request-Id': requestId },
    });
  }
}
