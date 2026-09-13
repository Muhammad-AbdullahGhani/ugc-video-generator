import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAvailableAssets, matchAssetsByCategory, ProductCategory } from './assets';
import { PageMetadata } from './metadata-extractor';
import { VideoBlueprint } from '@/types/chat';

export async function generateVideoBlueprint(
  markdownContent: string,
  sourceUrl: string,
  metadata?: PageMetadata
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

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])
  );

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
Analyze this product page from: ${sourceUrl}

Extracted Real Page Metadata:
- Page Title / OG Title: ${metadata?.ogTitle || 'None extracted'}
- Meta Description: ${metadata?.ogDescription || 'None extracted'}
- Extracted Theme / Brand Color: ${metadata?.themeColor || 'None extracted'}
- Detected Social Proof / Numbers: ${metadata?.socialProof || 'None extracted'}

Scraped Website Content (Markdown):
"""
${markdownContent.slice(0, 8000)}
"""

Instructions:
1. "category": Identify the product category from: ["fitness", "saas_dev", "food_beverage", "productivity", "ecommerce", "fintech", "general"].
2. "hook_text": Write a punchy, highly personalized 1-2 sentence kinetic text overlay (under 25 words total).
   - IMPORTANT: If real social-proof metrics exist (e.g. "${metadata?.socialProof || ''}" or stats in the copy like 1M+ users, 4.9 stars, 10x faster, $0), weave them naturally into the hook!
3. "gif_search_term": Select the most fitting reaction meme from: ["celebration", "ryan gosling", "shocked", "money", "mind blown", "confused"].
   - "celebration": Best for fitness, health, calorie tracking, gym gains, food & beverage, or milestone achievements.
   - "ryan gosling": Best for developer tools, IDEs, code editors, CLI tools, and sleek developer-focused SaaS.
   - "money": Best for fintech, high ROI, payments, revenue growth, or ecommerce savings.
   - "shocked": Best for surprising statistics, dramatic speedups, or hard-to-believe claims.
   - "confused": Best for chaotic manual workflows that this tool solves.
   - "mind blown": Best for cutting-edge AI breakthroughs and magical automation.
4. "brand_color": Provide a hex color code (e.g. "${metadata?.themeColor || '#FF6B00'}" or a dominant accent color suited for this brand).
5. "rationale": Write a clear, 1-sentence decision rationale explaining WHY the background clip, meme visual, and soundtrack style fit this product (e.g., "Used an energetic vertical reel + 'celebration' reaction meme + upbeat soundtrack because MyFitnessPal is a photo-based fitness app with instant meal scanning.").
6. "summary": A 1-sentence factual description of what the product does.

Return a strict JSON object matching this schema:
{
  "category": "fitness" | "saas_dev" | "food_beverage" | "productivity" | "ecommerce" | "fintech" | "general",
  "hook_text": string,
  "gif_search_term": string,
  "brand_color": string,
  "rationale": string,
  "summary": string
}
`.trim();

  let responseText = '';
  let lastError: unknown = null;

  for (const modelCandidate of candidateModels) {
    try {
      console.log(`[Gemini] Generating personalized blueprint using: ${modelCandidate}`);
      const model = genAI.getGenerativeModel({
        model: modelCandidate,
        systemInstruction:
          'You are a senior viral UGC video director. You analyze real product copy, real social proof, and brand positioning to design personalized, high-converting video blueprints rather than generic templates.',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.65,
        },
      });

      const result = await model.generateContent(prompt);
      responseText = result.response.text();
      if (responseText) {
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

  interface GeminiParsed {
    category?: ProductCategory;
    hook_text?: string;
    gif_search_term?: string;
    brand_color?: string;
    rationale?: string;
    summary?: string;
  }

  let parsed: GeminiParsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error(`Invalid JSON output from Gemini: ${responseText}`);
    }
  }

  const category: ProductCategory = parsed.category || 'general';

  // Category-aware asset matching
  const available = getAvailableAssets();
  const matched = matchAssetsByCategory(category, available);

  const background_video = matched.backgroundVideo;
  const audio_track = matched.audioTrack;
  const gif_search_term = parsed.gif_search_term || matched.defaultGif;
  const brand_color = parsed.brand_color || metadata?.themeColor || '#FF6B00';
  
  // Construct bulletproof factual rationale that strictly describes the actual assets chosen
  const productContext = parsed.summary || metadata?.ogTitle || sourceUrl;
  const rationale = `Used ${matched.footageDescription} + ${matched.audioDescription} + '${gif_search_term}' reaction meme tailored for ${productContext}.`;

  return {
    hook_text: parsed.hook_text || `Stop struggling with manual workflows — discover ${metadata?.ogTitle || sourceUrl}.`,
    gif_search_term,
    background_video,
    audio_track,
    source_url: sourceUrl,
    summary: parsed.summary,
    category,
    rationale,
    brand_color,
    og_title: metadata?.ogTitle,
    social_proof: metadata?.socialProof,
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
    return "Hi there! I'm your ReelForge UGC Assistant. Drop any product URL (e.g. `calai.app` or `linear.app`), and I'll generate a 9:16 vertical video for you!";
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])
  );

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction =
    "You are ReelForge's charismatic AI UGC producer. You chat naturally, concisely, and warmly. You answer general questions, share UGC marketing advice, or talk casually. You NEVER pretend to render a video unless a URL or product name is explicitly shared. When asked what you can do or when appropriate, invite the user to paste any product URL to generate a custom 9:16 vertical marketing video.";

  for (const modelCandidate of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelCandidate,
        systemInstruction,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      });

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

  return "Hey there! How can I help you today? Feel free to ask questions or drop a product link (e.g. `calai.app`) to generate a custom UGC video ad!";
}
