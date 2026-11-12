import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getFfmpegPath, getFfprobePath } from '@/lib/ffmpeg-binaries';
import { describeValidation, validateRender } from '@/lib/video-compositor';

const execFileAsync = promisify(execFile);

/**
 * Integration cover for the fabricated-verification bug: the old validator
 * caught its own failure and returned `{duration: 7.0, 720x1280, hasAudio: true}`,
 * so the UI printed a checkmark for a check that never ran.
 *
 * These tests synthesize a real file with FFmpeg and assert that the reported
 * numbers are measured, not assumed.
 */
describe('render validation', () => {
  let tempDir: string;
  let videoPath: string;
  let silentPath: string;
  let available = false;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reelforge-test-'));
    videoPath = path.join(tempDir, 'with-audio.mp4');
    silentPath = path.join(tempDir, 'no-audio.mp4');

    const render = (args: string[]) =>
      new Promise<number>((resolve, reject) => {
        const proc = spawn(getFfmpegPath(), args, { timeout: 60_000 });
        proc.on('error', reject);
        proc.on('close', (code) => resolve(code ?? -1));
      });

    try {
      // 7s of colour bars at 480x854 (vertical) with a tone.
      const withAudio = await render([
        '-y',
        '-f', 'lavfi', '-i', 'testsrc=size=480x854:rate=30:duration=7',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=7',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-t', '7',
        videoPath,
      ]);

      // The same clip with no audio stream at all.
      const noAudio = await render([
        '-y',
        '-f', 'lavfi', '-i', 'testsrc=size=480x854:rate=30:duration=7',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-t', '7',
        silentPath,
      ]);

      available = withAudio === 0 && noAudio === 0;
    } catch {
      available = false;
    }
  }, 120_000);

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('resolves an ffprobe binary from the installer package', async () => {
    const ffprobePath = getFfprobePath();
    expect(ffprobePath).not.toBeNull();

    // Prove it is a working binary, not just a path that exists.
    const { stdout } = await execFileAsync(ffprobePath!, ['-version'], { timeout: 10_000 });
    expect(stdout).toContain('ffprobe version');
  }, 30_000);

  it('measures duration, dimensions and audio from a real file', async () => {
    if (!available) return; // ffmpeg unavailable in this environment

    const result = await validateRender(videoPath);

    expect(result.verified).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.durationSeconds).toBeGreaterThan(6.5);
    expect(result.durationSeconds).toBeLessThan(7.5);
    expect(result.width).toBe(480);
    expect(result.height).toBe(854);
    expect(result.hasAudio).toBe(true);
    expect(result.fileSizeBytes).toBeGreaterThan(0);

    expect(describeValidation(result)).toContain('Verified with ffprobe');
  }, 60_000);

  it('reports a missing audio track instead of assuming one', async () => {
    if (!available) return;

    const result = await validateRender(silentPath);

    // The old implementation hardcoded hasAudio: true on every path.
    expect(result.verified).toBe(true);
    expect(result.hasAudio).toBe(false);
    expect(result.valid).toBe(false);
    expect(describeValidation(result)).toContain('no audio track');
  }, 60_000);

  it('says "not verified" rather than inventing numbers when probing fails', async () => {
    if (!available) return;

    // A file ffprobe cannot parse stands in for an unavailable probe: the
    // important property is that nothing plausible gets fabricated.
    const junkPath = path.join(tempDir, 'junk.mp4');
    await fs.writeFile(junkPath, Buffer.alloc(60_000, 1));

    const result = await validateRender(junkPath);

    expect(result.verified).toBe(false);
    expect(result.durationSeconds).toBeNull();
    expect(result.width).toBeNull();
    expect(result.hasAudio).toBeNull();
    expect(describeValidation(result)).toContain('not verified');
  }, 60_000);
});
