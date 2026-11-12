import { NextRequest, NextResponse } from 'next/server';
import { currentUserId } from '@/auth';
import { getUserVideos, saveUserVideo, deleteUserVideo } from '@/lib/user-videos';
import { SavedVideo } from '@/types/chat';
import { AppError, reportError } from '@/lib/errors';
import { createLogger, newRequestId } from '@/lib/logger';
import { enforce, LIMITS } from '@/lib/rate-limit';
import { sanitizePlainText } from '@/lib/validators';
import { extractUrl } from '@/lib/url-detector';

const log = createLogger('api:videos');

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

function failure(err: unknown, requestId: string) {
  const clientError = reportError(err, log, requestId);
  return NextResponse.json(clientError, {
    status: err instanceof AppError ? err.status : 500,
    headers: { 'X-Request-Id': requestId },
  });
}

async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new AppError('UNAUTHORIZED', 'no session on a videos request');
  return userId;
}

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);

    // Paginated: the store is read in full per request, so an unbounded page
    // size is a self-inflicted slow query as history grows.
    const limit = intParam(searchParams.get('limit'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const offset = intParam(searchParams.get('offset'), 0, 0, 100_000);

    const page = await getUserVideos(userId, { limit, offset });
    return NextResponse.json(page, { headers: { 'X-Request-Id': requestId } });
  } catch (err) {
    return failure(err, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const userId = await requireUserId();
    enforce(`videos:write:${userId}`, LIMITS.chat.limit, LIMITS.chat.windowMs);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new AppError('INVALID_REQUEST', 'request body was not valid json');
    }

    // videoUrl is replayed into a <video src>, so it is validated rather than
    // stored as whatever the client sent.
    const videoUrl = normalizeVideoUrl(body.videoUrl);
    if (!videoUrl) throw new AppError('INVALID_REQUEST', 'videoUrl was missing or not an allowed url');

    const detectedUrl = typeof body.detectedUrl === 'string' ? extractUrl(body.detectedUrl) : null;
    if (!detectedUrl) throw new AppError('INVALID_REQUEST', 'detectedUrl was missing or unparseable');

    const blueprint = (body.blueprint ?? {}) as SavedVideo['blueprint'];
    const hookText =
      sanitizePlainText(body.hookText, 200) ?? sanitizePlainText(blueprint?.hook_text, 200) ?? '';

    const video: SavedVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      userEmail: '',
      videoUrl,
      detectedUrl,
      hookText,
      blueprint: {
        hook_text: hookText,
        gif_search_term: sanitizePlainText(blueprint?.gif_search_term, 40) ?? '',
        background_video: sanitizePlainText(blueprint?.background_video, 120) ?? '',
        audio_track: sanitizePlainText(blueprint?.audio_track, 120) ?? '',
      },
      createdAt: new Date().toISOString(),
    };

    await saveUserVideo(video);
    return NextResponse.json({ video }, { status: 201, headers: { 'X-Request-Id': requestId } });
  } catch (err) {
    return failure(err, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const userId = await requireUserId();

    const videoId = new URL(req.url).searchParams.get('id');
    if (!videoId) throw new AppError('INVALID_REQUEST', 'missing id');

    // Scoped by userId inside the store, so this cannot delete another user's row.
    const deleted = await deleteUserVideo(videoId, userId);
    if (!deleted) throw new AppError('NOT_FOUND', `video ${videoId} not found for this user`);

    return NextResponse.json({ success: true }, { headers: { 'X-Request-Id': requestId } });
  } catch (err) {
    return failure(err, requestId);
  }
}

/** Accept only URLs we could have produced: our own signed path, or https. */
function normalizeVideoUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2_048) return null;

  if (value.startsWith('/api/video/')) return value;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}
