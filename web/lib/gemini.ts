import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAvailableAssets, pickRandomAsset } from './assets';

export interface VideoBlueprint {
  hook_text: string;
  gif_search_term: string;
  background_video: string;
  audio_track: string;
  source_url?: string;
  summary?: string;
}

export async function generateVideoBlueprint(
  markdownContent: string,
  sourceUrl: string
): Promise<VideoBlueprint> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing. Please add GEMINI_API_KEY to your web/.env.local file.'
    );
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])
  );

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
Analyze this website content from: ${sourceUrl}

Website Content (Markdown):
"""
${markdownContent}
"""

Instructions:
1. "hook_text": Write a punchy, 1-2 sentence kinetic text overlay (under 25 words total). It must sound like an authentic creator recommendation or shocking realization (e.g., "Stop wasting hours on X — this tool does it in 3 clicks.", "I found the secret hack everyone is talking about.").
2. "gif_search_term": Provide a concise meme or reaction keyword query suitable for Giphy/Tenor (e.g. "mind blown", "ryan gosling", "shocked", "shut up and take my money", "confused math lady").
3. "summary": A brief 1-sentence description of what the product actually does.

Return a strict JSON object matching this schema:
{
  "hook_text": string,
  "gif_search_term": string,
  "summary": string
}
`.trim();

  let responseText = '';
  let lastError: unknown = null;

  for (const modelCandidate of candidateModels) {
    try {
      console.log(`[Gemini] Generating UGC blueprint using model: ${modelCandidate}`);
      const model = genAI.getGenerativeModel({
        model: modelCandidate,
        systemInstruction:
          'You are a world-class viral UGC (User-Generated Content) marketer and TikTok/Reels ad creator. Your job is to extract the core value proposition of a product from its website content and write an irresistible, high-retention video hook and matching meme visual.',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const result = await model.generateContent(prompt);
      responseText = result.response.text();
      if (responseText) {
        console.log(`[Gemini] Generation succeeded with model: ${modelCandidate}`);
        break;
      }
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] Model ${modelCandidate} failed: ${errMsg}`);
      if (
        errMsg.includes('404') ||
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('not found') ||
        errMsg.includes('no longer available') ||
        errMsg.includes('Service Unavailable') ||
        errMsg.includes('high demand')
      ) {
        continue;
      }
      throw err;
    }
  }

  if (!responseText) {
    throw lastError || new Error('All candidate Flash models failed to generate response.');
  }

  let parsed: { hook_text?: string; gif_search_term?: string; summary?: string };
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    console.error('Failed to parse Gemini JSON response directly:', responseText);
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error(`Invalid JSON output from Gemini: ${responseText}`);
    }
  }

  // Randomly select background video and audio track from /web/public/assets
  const { videos, audios } = getAvailableAssets();
  const background_video = pickRandomAsset(videos, 'background_video.mp4');
  const audio_track = pickRandomAsset(audios, 'audio_track.mp3');

  return {
    hook_text: parsed.hook_text || 'Transform your workflow in seconds with this tool.',
    gif_search_term: parsed.gif_search_term || 'mind blown',
    background_video,
    audio_track,
    source_url: sourceUrl,
    summary: parsed.summary,
  };
}

export async function generateConversationalReply(
  userMessage: string,
  history?: Array<{ sender: 'user' | 'assistant'; text: string }>
): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    return "Hi there! I'm your UGC Video Assistant. Drop a product URL anytime (e.g. `calai.app`), and I'll generate a 5–10s marketing video for you!";
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])
  );

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction =
    "You are a friendly, witty, and helpful AI assistant specialized in UGC video marketing. You chat naturally, warmly, and concisely like ChatGPT. You can answer general questions, chat casually, tell jokes, or brainstorm marketing ideas. When asked what you can do or when naturally appropriate, let the user know they can drop any product or website URL (like calai.app or linear.app) into the chat anytime to generate an instant 5–10s UGC marketing video.";

  for (const modelCandidate of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelCandidate,
        systemInstruction,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 350,
        },
      });

      // Build context from recent history if provided
      let prompt = userMessage;
      if (history && history.length > 0) {
        const recent = history.slice(-5);
        const transcript = recent
          .map((m) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n');
        prompt = `Conversation so far:\n${transcript}\n\nUser: ${userMessage}\nAssistant:`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini Chat] Model ${modelCandidate} failed: ${errMsg}`);
      if (
        errMsg.includes('404') ||
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('not found') ||
        errMsg.includes('no longer available') ||
        errMsg.includes('Service Unavailable') ||
        errMsg.includes('high demand')
      ) {
        continue;
      }
    }
  }

  return "Hey there! How can I help you today? Feel free to ask me questions, or drop a product link (e.g. `calai.app`) to generate a UGC video ad!";
}
