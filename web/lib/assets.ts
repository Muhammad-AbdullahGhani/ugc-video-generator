import fs from 'fs';
import path from 'path';

export interface AvailableAssets {
  videos: string[];
  audios: string[];
}

export type ProductCategory =
  | 'fitness'
  | 'saas_dev'
  | 'food_beverage'
  | 'productivity'
  | 'ecommerce'
  | 'fintech'
  | 'general';

export function getAssetsDir(): string {
  const candidates = [
    path.join(process.cwd(), 'public', 'assets'),
    path.join(process.cwd(), 'web', 'public', 'assets'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return path.join(process.cwd(), 'public', 'assets');
}

export function getAvailableAssets(): AvailableAssets {
  const assetsDir = getAssetsDir();
  let videos: string[] = [];
  let audios: string[] = [];

  try {
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      videos = files.filter((f) => f.toLowerCase().endsWith('.mp4'));
      audios = files.filter((f) => f.toLowerCase().endsWith('.mp3'));
    }
  } catch (err) {
    console.error('Error scanning public/assets directory:', err);
  }

  return { videos, audios };
}

/**
 * Category-aware asset matching:
 * Matches background video clip, trending audio soundtrack, and preferred meme GIF
 * specifically tailored to the product's industry.
 */
export function matchAssetsByCategory(
  category: ProductCategory,
  available: AvailableAssets
): { backgroundVideo: string; audioTrack: string; defaultGif: string; rationale: string } {
  const { videos, audios } = available;

  const v1 = videos.find((v) => v.includes('15283135')) || videos[0] || 'background.mp4';
  const v2 = videos.find((v) => v.includes('15283174')) || videos[1] || videos[0] || 'background.mp4';

  const hiphop = audios.find((a) => a.includes('hip-hop')) || audios[0] || 'track.mp3';
  const driving = audios.find((a) => a.includes('driving-ambition')) || audios[0] || 'track.mp3';
  const acoustic = audios.find((a) => a.includes('sun-and-his-daughter')) || audios[0] || 'track.mp3';

  switch (category) {
    case 'fitness':
      return {
        backgroundVideo: v2,
        audioTrack: hiphop,
        defaultGif: 'mind blown',
        rationale: 'Used a high-energy kinetic vertical clip + upbeat beat since this is a fitness/wellness product.',
      };
    case 'saas_dev':
    case 'productivity':
      return {
        backgroundVideo: v1,
        audioTrack: driving,
        defaultGif: 'mind blown',
        rationale: 'Used a sleek focused background reel + driving electronic synth for this tech/SaaS workflow.',
      };
    case 'food_beverage':
    case 'ecommerce':
      return {
        backgroundVideo: v2,
        audioTrack: acoustic,
        defaultGif: 'celebration',
        rationale: 'Used a bright aesthetic vertical clip + uplifting audio tailored for modern DTC/consumer brand appeal.',
      };
    case 'fintech':
      return {
        backgroundVideo: v1,
        audioTrack: hiphop,
        defaultGif: 'money',
        rationale: 'Used an impactful motion reel + punchy soundtrack and money meme visual for this financial/conversion hook.',
      };
    default:
      return {
        backgroundVideo: v1,
        audioTrack: driving,
        defaultGif: 'shocked',
        rationale: 'Selected dynamic vertical background + trending soundtrack matching this product positioning.',
      };
  }
}

export function pickRandomAsset(files: string[], defaultName: string): string {
  if (!files || files.length === 0) {
    return defaultName;
  }
  const randomIndex = Math.floor(Math.random() * files.length);
  return files[randomIndex];
}
