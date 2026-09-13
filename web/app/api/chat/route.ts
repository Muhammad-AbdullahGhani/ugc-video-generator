import { NextRequest } from 'next/server';
import { extractUrl } from '@/lib/url-detector';
import { scrapeWebsiteMarkdown } from '@/lib/jina';
import { generateVideoBlueprint, generateConversationalReply } from '@/lib/gemini';
import { fetchReactionGif } from '@/lib/gif-fetcher';
import { renderUgcVideo } from '@/lib/video-compositor';
import { auth } from '@/auth';
import { saveUserVideo } from '@/lib/user-videos';
import { SavedVideo } from '@/types/chat';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Session optional for public chat
  }
  const userId = session?.user?.id || session?.user?.email;

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Invalid JSON request payload.' })}\n\n`,
      {
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        status: 400,
      }
    );
  }

  const message: string = (body.message || '').trim();

  if (!message) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Please provide a message or a product URL to get started.' })}\n\n`,
      {
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        status: 400,
      }
    );
  }

  const detectedUrl = extractUrl(message);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          console.warn('[Pipeline Stream] Enqueue failed:', err);
        }
      };

      try {
        if (!detectedUrl) {
          // Conversational flow for questions or greetings
          sendEvent({
            type: 'chat_thinking',
            message: 'Formulating response...',
          });
          const reply = await generateConversationalReply(message, body.history);
          sendEvent({
            type: 'chat',
            reply,
          });
          controller.close();
          return;
        }

        console.log(`[Pipeline] Detected URL for video generation: ${detectedUrl}`);

        // Step 1: Reading URL via Jina
        sendEvent({
          type: 'step',
          stepId: 'reading_url',
          step: {
            id: 'reading_url',
            label: 'Reading Website Content',
            description: `Connecting to ${detectedUrl} via Jina AI Reader...`,
            status: 'active',
            startedAt: Date.now(),
          },
        });

        let markdown = '';
        try {
          markdown = await scrapeWebsiteMarkdown(detectedUrl);
          sendEvent({
            type: 'step',
            stepId: 'reading_url',
            step: {
              id: 'reading_url',
              label: 'Website Ingested',
              description: `Extracted ${markdown.length.toLocaleString()} characters of product copy and positioning.`,
              status: 'completed',
              completedAt: Date.now(),
            },
          });
        } catch (scrapeErr: unknown) {
          const errorMsg =
            scrapeErr instanceof Error ? scrapeErr.message : 'Website scraping failed';
          sendEvent({
            type: 'error',
            stepId: 'reading_url',
            message: `Could not extract content from ${detectedUrl}: ${errorMsg}`,
            error: errorMsg,
            detectedUrl,
            retryable: true,
          });
          controller.close();
          return;
        }

        // Step 2: Extracting product context & generating blueprint
        sendEvent({
          type: 'step',
          stepId: 'extracting_context',
          step: {
            id: 'extracting_context',
            label: 'Extracting Product Context',
            description: 'Analyzing product value propositions and audience pain points with Gemini AI...',
            status: 'active',
            startedAt: Date.now(),
          },
        });

        let blueprint;
        try {
          blueprint = await generateVideoBlueprint(markdown, detectedUrl);

          sendEvent({
            type: 'step',
            stepId: 'extracting_context',
            step: {
              id: 'extracting_context',
              label: 'Context Extracted',
              description: 'Synthesized core product hooks and high-converting marketing angles.',
              status: 'completed',
              completedAt: Date.now(),
            },
          });

          sendEvent({
            type: 'step',
            stepId: 'generating_blueprint',
            step: {
              id: 'generating_blueprint',
              label: 'Viral UGC Blueprint Ready',
              description: `Hook: "${blueprint.hook_text}"`,
              status: 'completed',
              completedAt: Date.now(),
            },
            blueprint,
          });
        } catch (geminiErr: unknown) {
          const errorMsg =
            geminiErr instanceof Error ? geminiErr.message : 'Gemini analysis failed';
          sendEvent({
            type: 'error',
            stepId: 'extracting_context',
            message: `AI blueprint extraction failed: ${errorMsg}`,
            error: errorMsg,
            detectedUrl,
            retryable: true,
          });
          controller.close();
          return;
        }

        // Step 3: Selecting background clip & matching trending audio
        sendEvent({
          type: 'step',
          stepId: 'matching_media',
          step: {
            id: 'matching_media',
            label: 'Curating Video & Audio Assets',
            description: `Matching vertical background (${blueprint.background_video}) & trending soundtrack (${blueprint.audio_track})...`,
            status: 'active',
            startedAt: Date.now(),
          },
        });

        let gifPath = '';
        try {
          gifPath = await fetchReactionGif(blueprint.gif_search_term);

          sendEvent({
            type: 'step',
            stepId: 'matching_media',
            step: {
              id: 'matching_media',
              label: 'Media Assets Selected',
              description: `Synced reaction GIF for "${blueprint.gif_search_term}" with soundtrack.`,
              status: 'completed',
              completedAt: Date.now(),
            },
          });
        } catch (mediaErr: unknown) {
          const errorMsg =
            mediaErr instanceof Error ? mediaErr.message : 'Media asset selection failed';
          sendEvent({
            type: 'error',
            stepId: 'matching_media',
            message: `Asset curation failed: ${errorMsg}`,
            error: errorMsg,
            detectedUrl,
            retryable: true,
          });
          controller.close();
          return;
        }

        // Step 4: Compositing video with FFmpeg
        sendEvent({
          type: 'step',
          stepId: 'compositing_video',
          step: {
            id: 'compositing_video',
            label: 'Compositing 9:16 UGC Video',
            description: 'Rendering 1080x1920 MP4, burning kinetic typography, and mastering audio mix...',
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
          });

          const videoUrl = renderResult.publicUrl;

          sendEvent({
            type: 'step',
            stepId: 'compositing_video',
            step: {
              id: 'compositing_video',
              label: 'Compositing Complete',
              description: 'Rendered 9:16 high-definition video with custom audio mastering.',
              status: 'completed',
              completedAt: Date.now(),
            },
          });

          // Save video to user's history if authenticated
          if (userId) {
            try {
              const savedVideo: SavedVideo = {
                id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                userId,
                userEmail: session?.user?.email || 'user@reelforge.ai',
                userName: session?.user?.name || undefined,
                videoUrl,
                detectedUrl,
                hookText: blueprint.hook_text,
                blueprint,
                createdAt: new Date().toISOString(),
              };
              saveUserVideo(savedVideo);
            } catch (saveErr) {
              console.warn('[Pipeline] Could not auto-save video to history:', saveErr);
            }
          }

          const reply = `🎬 Here is your custom UGC marketing video for **${detectedUrl}**!`;

          sendEvent({
            type: 'complete',
            reply,
            detectedUrl,
            blueprint,
            videoUrl,
          });
        } catch (videoErr: unknown) {
          const errorMsg =
            videoErr instanceof Error ? videoErr.message : 'FFmpeg rendering failed';
          sendEvent({
            type: 'error',
            stepId: 'compositing_video',
            message: `Video compositing failed: ${errorMsg}`,
            error: errorMsg,
            detectedUrl,
            blueprint,
            retryable: true,
          });
        }

        controller.close();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unexpected pipeline failure';
        sendEvent({
          type: 'error',
          message: errorMsg,
          error: errorMsg,
          retryable: true,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
