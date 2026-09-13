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

export interface MatchedAssets {
  backgroundVideo: string;
  audioTrack: string;
  defaultGif: string;
  footageDescription: string;
  audioDescription: string;
  rationale: string;
}

/**
 * Category-aware asset matching:
 * Matches background video clip, trending audio soundtrack, and preferred meme GIF
 * specifically tailored to the product's industry.
 */
export function matchAssetsByCategory(
  category: ProductCategory,
  available: AvailableAssets
): MatchedAssets {
  const { videos, audios } = available;

  const ideVideo = videos.find((v) => v.includes('saas_dev_ide')) || 'saas_dev_ide.mp4';
  const fitnessVideo = videos.find((v) => v.includes('fitness_workout')) || 'fitness_workout.mp4';
  const foodVideo = videos.find((v) => v.includes('food_culinary')) || 'food_culinary.mp4';
  const techVideo = videos.find((v) => v.includes('tech_abstract')) || 'tech_abstract.mp4';

  const hiphop = audios.find((a) => a.includes('hip-hop')) || audios[0] || 'track.mp3';
  const driving = audios.find((a) => a.includes('driving-ambition')) || audios[0] || 'track.mp3';
  const acoustic = audios.find((a) => a.includes('sun-and-his-daughter')) || audios[0] || 'track.mp3';

  switch (category) {
    case 'fitness':
      return {
        backgroundVideo: fitnessVideo,
        audioTrack: hiphop,
        defaultGif: 'mind-blown',
        footageDescription: 'high-energy fitness telemetry reel with active cardio pacing HUD',
        audioDescription: 'upbeat rhythmic hip-hop beat',
        rationale: 'Used an active fitness telemetry reel with live cardio HUD + upbeat rhythmic beat + reaction meme tailored for calorie/health tracking.',
      };
    case 'saas_dev':
    case 'productivity':
      return {
        backgroundVideo: ideVideo,
        audioTrack: driving,
        defaultGif: 'mind-blown',
        footageDescription: 'dark-mode IDE screen recording showing live scrolling TypeScript code & terminal build logs',
        audioDescription: 'driving electronic synth soundtrack',
        rationale: 'Used an active dark-mode IDE screen recording with live TypeScript compilation logs + driving synth audio + reaction meme tailored for this developer workflow.',
      };
    case 'food_beverage':
    case 'ecommerce':
      return {
        backgroundVideo: foodVideo,
        audioTrack: acoustic,
        defaultGif: 'celebration',
        footageDescription: 'aesthetic culinary studio reel with botanical nutrition breakdown & recipe badges',
        audioDescription: 'bright acoustic soundtrack',
        rationale: 'Used an aesthetic culinary studio reel with macro nutrition breakdown + uplifting acoustic soundtrack + celebration meme tailored for modern beverage/DTC appeal.',
      };
    case 'fintech':
      return {
        backgroundVideo: techVideo,
        audioTrack: hiphop,
        defaultGif: 'money',
        footageDescription: 'high-velocity fintech metrics reel with real-time revenue graphs & conversion telemetry',
        audioDescription: 'punchy hip-hop beat',
        rationale: 'Used a high-velocity revenue telemetry reel + punchy soundtrack + money meme visual for this financial/conversion hook.',
      };
    default:
      return {
        backgroundVideo: ideVideo,
        audioTrack: driving,
        defaultGif: 'shocked',
        footageDescription: 'kinetic workflow screen recording with live telemetry',
        audioDescription: 'trending synth soundtrack',
        rationale: 'Selected an active workflow screen recording + trending synth soundtrack matching this product positioning.',
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
