import { NextRequest, NextResponse } from 'next/server';
import { extractUrl } from '@/lib/url-detector';
import { scrapeWebsiteMarkdown } from '@/lib/jina';
import { generateVideoBlueprint, generateConversationalReply } from '@/lib/gemini';
import { fetchReactionGif } from '@/lib/gif-fetcher';
import { renderUgcVideo } from '@/lib/video-compositor';
import { ChatApiResponse } from '@/types/chat';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = (body.message || '').trim();

    if (!message) {
      return NextResponse.json<ChatApiResponse>(
        {
          reply: 'Please provide a message or a product URL to get started.',
        },
        { status: 400 }
      );
    }

    const detectedUrl = extractUrl(message);

    if (detectedUrl) {
      console.log(`[Pipeline] Detected URL: ${detectedUrl}`);

      // Step 1: Scrape via Jina AI
      let markdown = '';
      try {
        console.log(`[Pipeline] Stage 1/3: Fetching Markdown via Jina Reader...`);
        markdown = await scrapeWebsiteMarkdown(detectedUrl);
        console.log(`[Pipeline] Scraped ${markdown.length} characters of Markdown.`);
      } catch (scrapeErr: unknown) {
        const errorMsg =
          scrapeErr instanceof Error ? scrapeErr.message : 'Failed to scrape website';
        console.error('[Pipeline] Scrape error:', errorMsg);
        return NextResponse.json<ChatApiResponse>({
          reply: `Detected your link (${detectedUrl}), but encountered an error scraping with Jina Reader: ${errorMsg}`,
          detectedUrl,
          stage: 'error',
          error: errorMsg,
        });
      }

      // Step 2: Analyze with Gemini API to generate Video Blueprint
      let blueprint;
      try {
        console.log(`[Pipeline] Stage 2/3: Sending Markdown to Gemini UGC Brain...`);
        blueprint = await generateVideoBlueprint(markdown, detectedUrl);
        console.log(`[Pipeline] Blueprint generated:`, blueprint);
      } catch (geminiErr: unknown) {
        const errorMsg =
          geminiErr instanceof Error ? geminiErr.message : 'Gemini analysis failed';
        console.error('[Pipeline] Gemini error:', errorMsg);
        return NextResponse.json<ChatApiResponse>({
          reply: `Scraped website content via Jina AI, but Gemini analysis could not complete: ${errorMsg}`,
          detectedUrl,
          stage: 'error',
          error: errorMsg,
        });
      }

      // Step 3: Fetch matching reaction GIF and assemble video with FFmpeg
      let videoUrl = '';
      try {
        console.log(`[Pipeline] Stage 3/3: Resolving GIF for term "${blueprint.gif_search_term}"...`);
        const gifPath = await fetchReactionGif(blueprint.gif_search_term);

        console.log(`[Pipeline] Assembling final UGC video with FFmpeg...`);
        const renderResult = await renderUgcVideo({
          backgroundVideoName: blueprint.background_video,
          audioTrackName: blueprint.audio_track,
          gifPath,
          hookText: blueprint.hook_text,
          durationSeconds: 7,
        });

        videoUrl = renderResult.publicUrl;
        console.log(`[Pipeline] UGC video ready at: ${videoUrl}`);

        const reply = `🎬 Here is your custom UGC marketing video for **${detectedUrl}**!

- **Viral Hook:** "${blueprint.hook_text}"
- **Reaction Meme:** \`${blueprint.gif_search_term}\`
- **Background:** \`${blueprint.background_video}\`
- **Audio:** \`${blueprint.audio_track}\`

You can play the video directly below or download the .mp4 file.`;

        return NextResponse.json<ChatApiResponse>({
          reply,
          detectedUrl,
          stage: 'completed',
          blueprint,
          videoUrl,
        });
      } catch (videoErr: unknown) {
        const errorMsg =
          videoErr instanceof Error ? videoErr.message : 'FFmpeg video rendering failed';
        console.error('[Pipeline] Video Assembly error:', errorMsg);

        // Fallback: return the blueprint even if FFmpeg had an issue
        return NextResponse.json<ChatApiResponse>({
          reply: `Generated UGC blueprint successfully, but video assembly failed: ${errorMsg}`,
          detectedUrl,
          stage: 'error',
          blueprint,
          error: errorMsg,
        });
      }
    }

    // Conversational flow for casual messages / questions (ChatGPT-style dynamic responses)
    console.log(`[Chat] Generating dynamic conversational reply for: "${message}"`);
    const reply = await generateConversationalReply(message, body.history);
    return NextResponse.json<ChatApiResponse>({ reply });
  } catch (error: unknown) {
    console.error('Error handling chat message:', error);
    return NextResponse.json<ChatApiResponse>(
      {
        reply: 'An error occurred while processing your request. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
