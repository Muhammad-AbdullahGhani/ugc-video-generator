import { NextRequest } from 'next/server';
import { extractUrl } from '@/lib/url-detector';
import { scrapeWebsiteMarkdown } from '@/lib/jina';
import { extractPageMetadata } from '@/lib/metadata-extractor';
import { generateVideoBlueprint, generateConversationalReply } from '@/lib/gemini';
import { fetchReactionGif } from '@/lib/gif-fetcher';
import { MemeMood } from '@/lib/assets';
import { renderUgcVideo, describeValidation } from '@/lib/video-compositor';
import { currentUserId } from '@/auth';
import { saveUserVideo } from '@/lib/user-videos';
import { SavedVideo } from '@/types/chat';
import { AppError, reportError } from '@/lib/errors';
import { createLogger, newRequestId } from '@/lib/logger';
import { clientIp, enforce, LIMITS } from '@/lib/rate-limit';
import { env } from '@/lib/env';
import { sanitizePlainText } from '@/lib/validators';

export const maxDuration = 60;

const log = createLogger('api:chat');

interface HistoryTurn {
  sender: 'user' | 'assistant';
  text: string;
}

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

/** One-shot SSE error response for failures before the stream opens. */
function errorResponse(err: unknown, requestId: string, context: Record<string, unknown> = {}) {
  const clientError = reportError(err, log, requestId, context);
  const payload = {
    type: 'error',
    code: clientError.code,
    message: clientError.message,
    error: clientError.message,
    requestId: clientError.requestId,
    retryable: clientError.retryable,
  };
  return new Response(`data: ${JSON.stringify(payload)}\n\n`, {
    status: err instanceof AppError ? err.status : 500,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Request-Id': requestId },
  });
}

/** Validate and bound the request body before any work is done on it. */
function parseBody(body: ChatRequestBody): { message: string; history: HistoryTurn[] } {
  if (typeof body.message !== 'string') {
    throw new AppError('INVALID_REQUEST', 'message must be a string');
  }

  const message = body.message.trim();
  if (!message) {
    throw new AppError('INVALID_REQUEST', 'message was empty');
  }
  if (message.length > env.limits.maxMessageChars) {
    throw new AppError(
      'INVALID_REQUEST',
      `message of ${message.length} chars exceeds the ${env.limits.maxMessageChars} cap`
    );
  }

  const history: HistoryTurn[] = [];
  if (Array.isArray(body.history)) {
    for (const turn of body.history.slice(-env.limits.maxHistoryTurns)) {
      if (!turn || typeof turn !== 'object') continue;
      const { sender, text } = turn as Partial<HistoryTurn>;
      if (sender !== 'user' && sender !== 'assistant') continue;
      const clean = sanitizePlainText(text, env.limits.maxMessageChars);
      if (clean) history.push({ sender, text: clean });
    }
  }

  return { message, history };
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const reqLog = log.child('request', { requestId });

  const userId = await currentUserId();
  const identity = userId ?? `ip:${clientIp(req)}`;

  let message: string;
  let history: HistoryTurn[];

  try {
    const budget = userId ? LIMITS.chat : LIMITS.anonymousChat;
    enforce(`chat:${identity}`, budget.limit, budget.windowMs);

    let raw: ChatRequestBody;
    try {
      raw = (await req.json()) as ChatRequestBody;
    } catch {
      throw new AppError('INVALID_REQUEST', 'request body was not valid json');
    }

    ({ message, history } = parseBody(raw));
  } catch (err) {
    return errorResponse(err, requestId, { identity });
  }

  // Does this turn ask for a video, or is it conversation?
  let detectedUrl = extractUrl(message);

  const lastAssistantMsg = history.filter((m) => m.sender === 'assistant').pop()?.text ?? '';
  const isFollowupDescription =
    !detectedUrl &&
    (lastAssistantMsg.includes('tell me more about') ||
      lastAssistantMsg.includes('Could you briefly tell me what') ||
      lastAssistantMsg.includes('did not have enough content')) &&
    message.split(' ').length >= 3;

  if (isFollowupDescription) {
    detectedUrl = history.map((m) => extractUrl(m.text)).filter(Boolean).pop() ?? null;
  }

  const wantsVideo = Boolean(detectedUrl);

  // Rendering costs an LLM call and a CPU-bound encode. It is not available
  // anonymously, and it is separately budgeted from chat.
  if (wantsVideo) {
    try {
      if (!userId) {
        throw new AppError('UNAUTHORIZED', 'anonymous request attempted a render');
      }
      enforce(`render:${userId}`, LIMITS.render.limit, LIMITS.render.windowMs);
    } catch (err) {
      return errorResponse(err, requestId, { identity, detectedUrl });
    }
  }

  const abortController = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const sendEvent = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          reqLog.warn('could not enqueue an event', { err: err as Error });
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by a cancel
        }
      };

      const fail = (err: unknown, stepId?: string, extra: Record<string, unknown> = {}) => {
        const clientError = reportError(err, reqLog, requestId, { detectedUrl, ...extra });
        sendEvent({
          type: 'error',
          stepId,
          code: clientError.code,
          message: clientError.message,
          error: clientError.message,
          requestId: clientError.requestId,
          retryable: clientError.retryable,
          detectedUrl,
        });
        close();
      };

      try {
        if (!detectedUrl) {
          sendEvent({ type: 'chat_thinking', message: 'Formulating response...' });
          const reply = await generateConversationalReply(message, history);
          sendEvent({ type: 'chat', reply });
          close();
          return;
        }

        reqLog.info('starting pipeline', { detectedUrl, userId });

        // --- Step 1: ingest ------------------------------------------------
        sendEvent({
          type: 'step',
          stepId: 'reading_url',
          step: {
            id: 'reading_url',
            label: 'Reading Website Content & Brand Data',
            description: `Connecting to ${detectedUrl} via Jina Reader & inspecting OG metadata...`,
            status: 'active',
            startedAt: Date.now(),
          },
        });

        let markdown = '';
        let metadata = null;

        if (isFollowupDescription) {
          markdown = `# User Provided Description for ${detectedUrl}\n\n${message}`;
          metadata = {
            ogTitle: new URL(detectedUrl).hostname,
            ogDescription: message,
            themeColor: '#FF6B00',
            socialProof: '',
          };
          sendEvent({
            type: 'step',
            stepId: 'reading_url',
            step: {
              id: 'reading_url',
              label: 'User Context Received',
              description: 'Synthesizing blueprint directly from your product description.',
              status: 'completed',
              completedAt: Date.now(),
            },
          });
        } else {
          try {
            const [scrapedMd, extractedMeta] = await Promise.all([
              scrapeWebsiteMarkdown(detectedUrl).catch((err) => {
                // A policy refusal must not be softened into an empty scrape.
                if (err instanceof AppError && err.code === 'URL_NOT_ALLOWED') throw err;
                reqLog.debug('jina scrape failed', { err: err as Error });
                return '';
              }),
              extractPageMetadata(detectedUrl).catch((err) => {
                if (err instanceof AppError && err.code === 'URL_NOT_ALLOWED') throw err;
                return null;
              }),
            ]);

            markdown = scrapedMd;
            metadata = extractedMeta;
          } catch (err) {
            fail(err, 'reading_url');
            return;
          }

          if (!markdown && !metadata?.ogTitle) {
            fail(new AppError('URL_UNREACHABLE', `nothing retrievable from ${detectedUrl}`), 'reading_url');
            return;
          }

          if (markdown.trim().length < 80 && !metadata?.ogDescription) {
            // Not a failure: ask the user for the missing context instead.
            sendEvent({
              type: 'chat',
              reply: `I reached that page, but it did not have enough content to work from. Tell me what the product does in one sentence and I will cut the reel.`,
              detectedUrl,
            });
            close();
            return;
          }

          const highlights = [
            metadata?.ogTitle ? `"${metadata.ogTitle}"` : '',
            metadata?.themeColor ? `color ${metadata.themeColor}` : '',
            metadata?.socialProof ? `social proof (${metadata.socialProof})` : '',
          ]
            .filter(Boolean)
            .join(', ');

          sendEvent({
            type: 'step',
            stepId: 'reading_url',
            step: {
              id: 'reading_url',
              label: 'Brand & Content Ingested',
              description: `Extracted ${markdown.length.toLocaleString()} chars${highlights ? ` with ${highlights}` : ''}.`,
              status: 'completed',
              completedAt: Date.now(),
            },
          });
        }

        // --- Step 2: blueprint ---------------------------------------------
        sendEvent({
          type: 'step',
          stepId: 'extracting_context',
          step: {
            id: 'extracting_context',
            label: 'Analyzing Product Context & Angles',
            description: 'Analyzing value propositions, audience pain points, and social proof with Gemini AI...',
            status: 'active',
            startedAt: Date.now(),
          },
        });

        let blueprint;
        try {
          blueprint = await generateVideoBlueprint(markdown, detectedUrl, metadata ?? undefined);
        } catch (err) {
          fail(err, 'extracting_context');
          return;
        }

        sendEvent({
          type: 'step',
          stepId: 'extracting_context',
          step: {
            id: 'extracting_context',
            label: 'Context Analyzed',
            description: `Identified category: [${blueprint.category?.toUpperCase()}] • Brand tone: ${blueprint.brand_color}`,
            status: 'completed',
            completedAt: Date.now(),
          },
        });

        sendEvent({
          type: 'step',
          stepId: 'generating_blueprint',
          step: {
            id: 'generating_blueprint',
            label: 'Personalized UGC Blueprint Ready',
            description: `Hook: "${blueprint.hook_text}"`,
            status: 'completed',
            completedAt: Date.now(),
          },
          blueprint,
        });

        // --- Step 3: media --------------------------------------------------
        sendEvent({
          type: 'step',
          stepId: 'matching_media',
          step: {
            id: 'matching_media',
            label: 'Matching Industry Assets',
            description: `Category [${blueprint.category}]: Selecting vertical clip (${blueprint.background_video}) & soundtrack (${blueprint.audio_track})...`,
            status: 'active',
            startedAt: Date.now(),
          },
        });

        let gifPath: string;
        try {
          gifPath = await fetchReactionGif(
            blueprint.gif_search_term,
            blueprint.mood as MemeMood | undefined
          );
        } catch (err) {
          fail(err, 'matching_media');
          return;
        }

        sendEvent({
          type: 'step',
          stepId: 'matching_media',
          step: {
            id: 'matching_media',
            label: 'Media Assets Tailored',
            description: `Synced meme reaction ("${blueprint.gif_search_term}") with ${blueprint.category} soundtrack.`,
            status: 'completed',
            completedAt: Date.now(),
          },
        });

        // --- Step 4+5: render and verify -------------------------------------
        sendEvent({
          type: 'step',
          stepId: 'compositing_video',
          step: {
            id: 'compositing_video',
            label: 'Compositing 9:16 UGC Video',
            description: `Rendering 720x1280 MP4 with brand styling (${blueprint.brand_color}) & kinetic typography...`,
            status: 'active',
            startedAt: Date.now(),
          },
        });

        try {
          const renderResult = await renderUgcVideo({
            backgroundVideoName: blueprint.background_video,
            audioTrackName: blueprint.audio_track,
            gifPath,
            hookText: blueprint.hook_text,
            durationSeconds: 7,
            brandColor: blueprint.brand_color,
            signal: abortController.signal,
          });

          sendEvent({
            type: 'step',
            stepId: 'compositing_video',
            step: {
              id: 'compositing_video',
              label: 'Compositing Complete',
              description: 'Rendered 9:16 vertical video with custom brand highlight overlay.',
              status: 'completed',
              completedAt: Date.now(),
            },
          });

          // Report what was measured, not what we hoped. When ffprobe is absent
          // this says so rather than printing a checkmark.
          sendEvent({
            type: 'step',
            stepId: 'validating_video',
            step: {
              id: 'validating_video',
              label: renderResult.validation.verified
                ? 'Automated ffprobe Quality Verification'
                : 'Quality Verification Skipped',
              description: describeValidation(renderResult.validation),
              status: renderResult.validation.verified ? 'completed' : 'pending',
              completedAt: Date.now(),
            },
          });

          if (userId) {
            try {
              const savedVideo: SavedVideo = {
                id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                userId,
                userEmail: '',
                videoUrl: renderResult.publicUrl,
                detectedUrl,
                hookText: blueprint.hook_text,
                blueprint,
                createdAt: new Date().toISOString(),
                rationale: blueprint.rationale,
              };
              await saveUserVideo(savedVideo);
            } catch (err) {
              // History is a convenience; never fail a finished render over it.
              reqLog.warn('could not save video to history', { err: err as Error });
            }
          }

          sendEvent({
            type: 'complete',
            reply: `Reel is ready for ${detectedUrl}. ${blueprint.hook_text}`,
            detectedUrl,
            blueprint,
            videoUrl: renderResult.publicUrl,
            rationale: blueprint.rationale,
          });
          close();
        } catch (err) {
          fail(err, 'compositing_video', { blueprint: blueprint.category });
        }
      } catch (err) {
        fail(err);
      }
    },

    /**
     * The client closed the tab or navigated away. Without this the encode kept
     * running to completion with nobody to receive it.
     */
    cancel(reason) {
      reqLog.info('client disconnected, aborting pipeline', { reason: String(reason ?? '') });
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Request-Id': requestId,
    },
  });
}
