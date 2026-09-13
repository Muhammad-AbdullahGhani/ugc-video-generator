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

export type MemeMood = 'surprise' | 'hype' | 'facepalm' | 'focused';

export interface MoodConfig {
  name: string;
  gifs: string[];
  giphySearch: string;
}

export const MOOD_POOLS: Record<MemeMood, MoodConfig> = {
  surprise: {
    name: 'mind blown / surprise',
    gifs: ['mind-blown.gif', 'shocked.gif'],
    giphySearch: 'mind blown reaction',
  },
  hype: {
    name: 'hype/excited',
    gifs: ['celebration.gif', 'money.gif'],
    giphySearch: 'celebration victory dance',
  },
  facepalm: {
    name: 'relatable/facepalm',
    gifs: ['confused.gif'],
    giphySearch: 'confused facepalm math',
  },
  focused: {
    name: 'focused/nodding',
    gifs: ['ryan-gosling.gif'],
    giphySearch: 'approving nod focused',
  },
};

export interface MatchedAssets {
  backgroundVideo: string;
  audioTrack: string;
  defaultGif: string;
  mood: MemeMood;
  footageDescription: string;
  audioDescription: string;
  rationale: string;
}

interface CategoryPoolConfig {
  videoCandidates: string[];
  mood: MemeMood;
  defaultGif: string;
  audioKeyword: string;
  footageDescription: string;
  audioDescription: string;
  rationaleTpl: string;
}

const CATEGORY_MAP: Record<ProductCategory, CategoryPoolConfig> = {
  fitness: {
    videoCandidates: ['fitness_workout.mp4', 'fitness_cardio.mp4'],
    mood: 'hype',
    defaultGif: 'celebration.gif',
    audioKeyword: 'hip-hop',
    footageDescription: 'high-energy fitness telemetry reel with active cardio pacing HUD',
    audioDescription: 'upbeat rhythmic hip-hop beat',
    rationaleTpl: 'Used an active fitness telemetry reel with live cardio pacing + upbeat rhythmic beat + celebration meme tailored for calorie/health tracking.',
  },
  saas_dev: {
    videoCandidates: ['saas_dev_ide.mp4', 'saas_dev_terminal.mp4'],
    mood: 'focused',
    defaultGif: 'ryan-gosling.gif',
    audioKeyword: 'driving-ambition',
    footageDescription: 'dark-mode IDE screen recording showing live scrolling TypeScript code & terminal build logs',
    audioDescription: 'driving electronic synth soundtrack',
    rationaleTpl: 'Used an active dark-mode IDE screen recording with live TypeScript compilation logs + driving synth audio + focused reaction meme tailored for this developer workflow.',
  },
  productivity: {
    videoCandidates: ['saas_dev_ide.mp4', '15283174-hd_1080_1920_30fps.mp4'],
    mood: 'surprise',
    defaultGif: 'mind-blown.gif',
    audioKeyword: 'driving-ambition',
    footageDescription: 'dark-mode workflow screen recording showing live code & terminal build logs',
    audioDescription: 'driving electronic synth soundtrack',
    rationaleTpl: 'Used an active workflow screen recording + driving synth audio + mind-blown reaction meme tailored for productivity speed.',
  },
  food_beverage: {
    videoCandidates: ['food_culinary.mp4', '15283174-hd_1080_1920_30fps.mp4'],
    mood: 'hype',
    defaultGif: 'celebration.gif',
    audioKeyword: 'sun-and-his-daughter',
    footageDescription: 'aesthetic culinary studio reel with botanical nutrition breakdown & recipe badges',
    audioDescription: 'bright acoustic soundtrack',
    rationaleTpl: 'Used an aesthetic culinary studio reel with macro nutrition breakdown + uplifting acoustic soundtrack + celebration meme tailored for modern beverage/DTC appeal.',
  },
  ecommerce: {
    videoCandidates: ['food_culinary.mp4', '15283174-hd_1080_1920_30fps.mp4'],
    mood: 'surprise',
    defaultGif: 'shocked.gif',
    audioKeyword: 'sun-and-his-daughter',
    footageDescription: 'vibrant product showcase reel with real-time conversion badges',
    audioDescription: 'bright acoustic soundtrack',
    rationaleTpl: 'Used a vibrant product showcase reel + uplifting acoustic soundtrack + shocked reaction meme tailored for consumer ecommerce appeal.',
  },
  fintech: {
    videoCandidates: ['tech_abstract.mp4', '15283135-hd_1080_1920_30fps.mp4'],
    mood: 'hype',
    defaultGif: 'money.gif',
    audioKeyword: 'hip-hop',
    footageDescription: 'high-velocity fintech metrics reel with real-time revenue graphs & conversion telemetry',
    audioDescription: 'punchy hip-hop beat',
    rationaleTpl: 'Used a high-velocity revenue telemetry reel + punchy soundtrack + money meme visual for this financial/conversion hook.',
  },
  general: {
    videoCandidates: ['15283174-hd_1080_1920_30fps.mp4', '15283135-hd_1080_1920_30fps.mp4'],
    mood: 'surprise',
    defaultGif: 'shocked.gif',
    audioKeyword: 'driving-ambition',
    footageDescription: 'kinetic 3D product motion reel with live telemetry',
    audioDescription: 'trending synth soundtrack',
    rationaleTpl: 'Selected an active workflow screen recording + trending synth soundtrack matching this product positioning.',
  },
};

/**
 * Category-aware asset matching:
 * Matches background video clip from the category's pool (so two products in the same category
 * have variety), selects trending audio soundtrack, and pairs a mood-aligned reaction meme GIF.
 */
export function matchAssetsByCategory(
  category: ProductCategory,
  available: AvailableAssets
): MatchedAssets {
  const { videos, audios } = available;
  const config = CATEGORY_MAP[category] || CATEGORY_MAP.general;

  // 1. Pick background video from candidate pool
  const matchingVideos = videos.filter((v) =>
    config.videoCandidates.some((candidate) => v.toLowerCase().includes(candidate.toLowerCase()))
  );
  const backgroundVideo =
    matchingVideos.length > 0
      ? pickRandomAsset(matchingVideos, config.videoCandidates[0])
      : config.videoCandidates[0];

  // 2. Pick audio track matching category preference
  const matchingAudio = audios.find((a) =>
    a.toLowerCase().includes(config.audioKeyword.toLowerCase())
  );
  const audioTrack = matchingAudio || audios[0] || 'track.mp3';

  // 3. Pick reaction GIF from the mood's small pool
  const moodPool = MOOD_POOLS[config.mood].gifs;
  const chosenGif = pickRandomAsset(moodPool, config.defaultGif);

  return {
    backgroundVideo,
    audioTrack,
    defaultGif: chosenGif,
    mood: config.mood,
    footageDescription: config.footageDescription,
    audioDescription: config.audioDescription,
    rationale: config.rationaleTpl,
  };
}

export function pickRandomAsset(files: string[], defaultName: string): string {
  if (!files || files.length === 0) {
    return defaultName;
  }
  const randomIndex = Math.floor(Math.random() * files.length);
  return files[randomIndex];
}
