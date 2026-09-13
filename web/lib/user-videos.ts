import fs from 'fs';
import path from 'path';
import { SavedVideo } from '@/types/chat';

// Store path: uses /tmp on serverless environments (Vercel) or .data/ in local node
function getStoreFilePath(): string {
  const isServerless = !!process.env.VERCEL;
  const baseDir = isServerless ? '/tmp' : path.join(process.cwd(), '.data');
  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch {
      // Fallback
    }
  }
  return path.join(baseDir, 'user_videos.json');
}

// In-memory fallback if disk is read-only
let memoryStore: SavedVideo[] = [];

function readAllVideos(): SavedVideo[] {
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[UserVideosStore] Failed reading from file store, using memory:', err);
  }
  return memoryStore;
}

function writeAllVideos(videos: SavedVideo[]): void {
  memoryStore = videos;
  try {
    const filePath = getStoreFilePath();
    fs.writeFileSync(filePath, JSON.stringify(videos, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[UserVideosStore] Failed writing to file store, memory only:', err);
  }
}

export function getUserVideos(userIdentifier: string): SavedVideo[] {
  if (!userIdentifier) return [];
  const all = readAllVideos();
  return all
    .filter(
      (v) =>
        v.userId === userIdentifier ||
        v.userEmail?.toLowerCase() === userIdentifier.toLowerCase()
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveUserVideo(video: SavedVideo): SavedVideo {
  const all = readAllVideos();
  // Avoid duplicates
  const existingIdx = all.findIndex((v) => v.id === video.id);
  if (existingIdx >= 0) {
    all[existingIdx] = video;
  } else {
    all.unshift(video);
  }
  writeAllVideos(all);
  return video;
}

export function deleteUserVideo(videoId: string, userIdentifier: string): boolean {
  const all = readAllVideos();
  const filtered = all.filter(
    (v) =>
      !(
        v.id === videoId &&
        (v.userId === userIdentifier ||
          v.userEmail?.toLowerCase() === userIdentifier.toLowerCase())
      )
  );
  writeAllVideos(filtered);
  return filtered.length !== all.length;
}
