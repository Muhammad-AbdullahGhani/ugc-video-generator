/**
 * Per-user video history.
 *
 * Ownership is keyed on `userId` alone. The previous `userId === x || email === x`
 * lookup was an IDOR waiting to happen: any code path where the id was absent fell
 * through to an email match, and emails were attacker-supplied by the guest
 * provider.
 *
 * Durability: this is a JSON file store. Writes are serialized through a mutex and
 * committed atomically (temp file + rename) so concurrent saves cannot interleave
 * or truncate the file. That makes it correct on a single instance with a real
 * disk. It is NOT correct on multi-instance serverless, where the temp directory
 * is per-instance and wiped on cold start — `assertDurableStore()` says so loudly
 * at boot. Swap the three functions at the bottom for a database client when you
 * need cross-instance persistence; nothing else in the codebase touches the file.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SavedVideo } from '@/types/chat';
import { env } from './env';
import { Mutex } from './concurrency';
import { createLogger } from './logger';

const log = createLogger('store');
const writeLock = new Mutex();

/** Oldest records are dropped past this, so one user cannot grow the file forever. */
const MAX_RECORDS_PER_USER = 200;
const MAX_TOTAL_RECORDS = 5_000;

function storeDir(): string {
  if (env.dataDir) return env.dataDir;
  if (env.isServerless) return path.join(os.tmpdir(), 'reelforge');
  return path.join(process.cwd(), '.data');
}

function storePath(): string {
  return path.join(storeDir(), 'user_videos.json');
}

/** Warn once, at boot, if the configured store cannot actually survive a restart. */
export function assertDurableStore(): void {
  if (env.isProduction && env.isServerless && !env.dataDir) {
    log.warn(
      'video history is stored on ephemeral per-instance disk — records will be lost on ' +
        'cold start and are invisible to other instances. Configure a database before ' +
        'promising users a persistent library.',
      { dir: storeDir() }
    );
  }
}

/** Survives a read-only or missing directory by degrading to memory for this instance. */
let memoryStore: SavedVideo[] | null = null;

async function readAll(): Promise<SavedVideo[]> {
  if (memoryStore) return memoryStore;

  try {
    const raw = await fs.readFile(storePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedVideo[]) : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      log.warn('could not read video store, continuing with an empty set', { err: err as Error });
    }
    return [];
  }
}

/** Atomic: write a sibling temp file, fsync-by-rename over the original. */
async function writeAll(videos: SavedVideo[]): Promise<void> {
  const bounded = videos.slice(0, MAX_TOTAL_RECORDS);
  const target = storePath();
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;

  try {
    await fs.mkdir(storeDir(), { recursive: true });
    await fs.writeFile(temp, JSON.stringify(bounded), 'utf-8');
    await fs.rename(temp, target);
    memoryStore = null;
  } catch (err) {
    log.warn('video store is not writable, holding records in memory only', { err: err as Error });
    memoryStore = bounded;
    await fs.unlink(temp).catch(() => {});
  }
}

export interface VideoPage {
  videos: SavedVideo[];
  total: number;
  hasMore: boolean;
}

export async function getUserVideos(
  userId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<VideoPage> {
  if (!userId) return { videos: [], total: 0, hasMore: false };

  const all = await readAll();
  const mine = all
    .filter((v) => v.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const page = mine.slice(offset, offset + limit);
  return { videos: page, total: mine.length, hasMore: offset + page.length < mine.length };
}

export async function saveUserVideo(video: SavedVideo): Promise<SavedVideo> {
  return writeLock.run(async () => {
    const all = await readAll();

    const existing = all.findIndex((v) => v.id === video.id);
    if (existing >= 0) all[existing] = video;
    else all.unshift(video);

    // Trim this user's tail rather than the global tail, so a busy user cannot
    // evict everyone else's history.
    const mine = all.filter((v) => v.userId === video.userId);
    if (mine.length > MAX_RECORDS_PER_USER) {
      const keep = new Set(
        mine
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_RECORDS_PER_USER)
          .map((v) => v.id)
      );
      await writeAll(all.filter((v) => v.userId !== video.userId || keep.has(v.id)));
      return video;
    }

    await writeAll(all);
    return video;
  });
}

export async function deleteUserVideo(videoId: string, userId: string): Promise<boolean> {
  return writeLock.run(async () => {
    const all = await readAll();
    const remaining = all.filter((v) => !(v.id === videoId && v.userId === userId));
    if (remaining.length === all.length) return false;
    await writeAll(remaining);
    return true;
  });
}
