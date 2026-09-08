import fs from 'fs';
import path from 'path';

export interface AvailableAssets {
  videos: string[];
  audios: string[];
}

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

export function pickRandomAsset(files: string[], defaultName: string): string {
  if (!files || files.length === 0) {
    return defaultName;
  }
  const randomIndex = Math.floor(Math.random() * files.length);
  return files[randomIndex];
}
