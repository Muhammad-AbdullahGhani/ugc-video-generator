import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getAssetsDir } from './assets';
import { storeVideo } from './storage';
import { getFfmpegPath, getFfprobePath } from './ffmpeg-binaries';
import { getRendersDir, sweepOldRenders } from './render-paths';
import { env } from './env';
import { AppError } from './errors';
import { createLogger } from './logger';
import { Semaphore } from './concurrency';
import { normalizeHexColor } from './validators';

const execFileAsync = promisify(execFile);
const log = createLogger('render');

// Re-exported so existing callers keep a single import site for the pipeline.
export { getFfmpegPath, getFfprobePath } from './ffmpeg-binaries';
export { getRendersDir, sweepOldRenders } from './render-paths';

/**
 * FFmpeg saturates a core per process. Without a ceiling, concurrent requests
 * turn into a self-inflicted denial of service; past the queue depth we fail
 * fast with RENDER_BUSY rather than letting callers pile up behind a timeout.
 */
const renderSlots = new Semaphore(env.render.maxConcurrent);
const MAX_QUEUED_RENDERS = env.render.maxConcurrent * 4;

/** Keep only the tail of FFmpeg's stderr: it is unbounded and mostly progress noise. */
const MAX_STDERR_CHARS = 8_000;

export interface RenderOptions {
  backgroundVideoName: string;
  audioTrackName: string;
  gifPath: string;
  hookText: string;
  durationSeconds?: number;
  brandColor?: string;
  /** Aborts the encode when the client goes away. */
  signal?: AbortSignal;
}

export interface VideoValidation {
  /** False when ffprobe could not run. Never claim a check that did not happen. */
  verified: boolean;
  valid: boolean;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean | null;
  fileSizeBytes: number;
}

export interface RenderResult {
  publicUrl: string;
  filename: string;
  durationSeconds: number;
  validation: VideoValidation;
}

function wrapText(text: string, maxLineLength = 22): string {
  const words = text.replace(/\n/g, ' ').split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Measure the rendered file. Every field is probed, never assumed — including
 * audio, which the previous implementation hardcoded to `true`.
 */
export async function validateRender(filePath: string): Promise<VideoValidation> {
  const { size } = await fs.stat(filePath);
  const ffprobePath = getFfprobePath();

  const unverified: VideoValidation = {
    verified: false,
    // Without a probe, a plausible file size is the only signal we actually have.
    valid: size > 50_000,
    durationSeconds: null,
    width: null,
    height: null,
    hasAudio: null,
    fileSizeBytes: size,
  };

  if (!ffprobePath) return unverified;

  try {
    // execFile with an args array: no shell, so a path can never be interpreted.
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-show_entries', 'stream=codec_type,width,height',
        '-of', 'json',
        filePath,
      ],
      { timeout: 8_000, maxBuffer: 1024 * 1024 }
    );

    const probe = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    };

    const durationSeconds = Number.parseFloat(probe.format?.duration ?? '');
    const videoStream = probe.streams?.find((s) => s.codec_type === 'video');
    const hasAudio = Boolean(probe.streams?.some((s) => s.codec_type === 'audio'));

    const width = videoStream?.width ?? null;
    const height = videoStream?.height ?? null;

    const durationOk = Number.isFinite(durationSeconds) && durationSeconds >= 4.5 && durationSeconds <= 11;
    const isVertical = width !== null && height !== null && height > width;

    return {
      verified: true,
      valid: durationOk && isVertical && hasAudio && size > 10_000,
      durationSeconds: Number.isFinite(durationSeconds) ? Math.round(durationSeconds * 10) / 10 : null,
      width,
      height,
      hasAudio,
      fileSizeBytes: size,
    };
  } catch (err) {
    log.warn('ffprobe failed; reporting the render as unverified', { err: err as Error });
    return unverified;
  }
}

/** Human-readable description of what was actually measured. */
export function describeValidation(v: VideoValidation): string {
  if (!v.verified) {
    return `Rendered ${(v.fileSizeBytes / 1024 / 1024).toFixed(1)} MB. ffprobe unavailable — duration and streams not verified.`;
  }
  const parts = [
    v.durationSeconds !== null ? `${v.durationSeconds}s` : null,
    v.width && v.height ? `${v.width}x${v.height}` : null,
    v.hasAudio ? 'audio present' : 'no audio track',
  ].filter(Boolean);
  return `Verified with ffprobe: ${parts.join(', ')}.`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

interface FfmpegOutcome {
  code: number | null;
  stderrTail: string;
  timedOut: boolean;
  aborted: boolean;
}

function runFfmpeg(args: string[], signal?: AbortSignal): Promise<FfmpegOutcome> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfmpegPath(), args, {
      // Hard ceiling enforced by Node, independent of anything FFmpeg does.
      timeout: env.render.timeoutMs,
      killSignal: 'SIGKILL',
    });

    let stderrTail = '';
    let timedOut = false;
    let aborted = false;

    const onAbort = () => {
      aborted = true;
      proc.kill('SIGKILL');
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-MAX_STDERR_CHARS);
    });

    proc.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort);
      reject(new AppError('RENDER_FAILED', `could not spawn ffmpeg: ${err.message}`, err));
    });

    proc.on('close', (code, closeSignal) => {
      signal?.removeEventListener('abort', onAbort);
      if (closeSignal === 'SIGKILL' && !aborted) timedOut = true;
      resolve({ code, stderrTail, timedOut, aborted });
    });
  });
}

export async function renderUgcVideo(
  options: RenderOptions,
  attempt = 0
): Promise<RenderResult> {
  return renderSlots.run(() => renderOnce(options, attempt), MAX_QUEUED_RENDERS);
}

async function renderOnce(options: RenderOptions, attempt: number): Promise<RenderResult> {
  const {
    backgroundVideoName,
    audioTrackName,
    gifPath,
    hookText,
    durationSeconds = 7,
    brandColor,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new AppError('RENDER_FAILED', 'client disconnected before the render started');
  }

  void sweepOldRenders();

  const assetsDir = await getAssetsDir();
  const rendersDir = await getRendersDir();

  const bgVideoPath = await resolveAsset(assetsDir, backgroundVideoName, '.mp4');
  const audioTrackPath = await resolveAsset(assetsDir, audioTrackName, '.mp3');

  if (!(await exists(gifPath))) {
    throw new AppError('ASSET_UNAVAILABLE', `reaction gif missing: ${gifPath}`);
  }

  const outputId = `ugc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const outputFilename = `${outputId}.mp4`;
  const outputPath = path.join(rendersDir, outputFilename);
  const textFile = path.join(rendersDir, `${outputId}_text.txt`);

  // drawtext reads the hook from a file rather than from the filter string, so
  // the text can never terminate a filter clause.
  await fs.writeFile(textFile, wrapText(hookText), 'utf8');

  const fontPath = await resolveFont(assetsDir);
  const escapedFontPath = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escapedTextPath = textFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Strict hex only. A length check is not a content check: six arbitrary
  // characters containing `;` used to be interpolated straight into the graph.
  const borderColor = `0x${normalizeHexColor(brandColor)}`;

  const filterComplex = [
    `[0:v]trim=duration=${durationSeconds},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setpts=PTS-STARTPTS[bg]`,
    `[1:v]scale=320:-2,pad=328:ih+8:4:4:color=${borderColor}[gif_framed]`,
    `[bg][gif_framed]overlay=(W-w)/2:640:shortest=1[comp1]`,
    `[comp1]drawtext=textfile='${escapedTextPath}':fontfile='${escapedFontPath}':fontsize=34:fontcolor=white:borderw=3:bordercolor=${borderColor}:box=1:boxcolor=black@0.82:boxborderw=14:line_spacing=12:x=(w-text_w)/2:y=200[v]`,
    `[2:a]afade=t=out:st=${durationSeconds - 1}:d=1[a]`,
  ].join(';');

  const args = [
    '-y',
    '-t', String(durationSeconds), '-i', bgVideoPath,
    '-ignore_loop', '0', '-t', String(durationSeconds), '-i', gifPath,
    '-t', String(durationSeconds), '-i', audioTrackPath,
    '-filter_complex', filterComplex,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '27', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', String(durationSeconds),
    outputPath,
  ];

  const startedAt = Date.now();
  log.info('starting encode', { outputFilename, attempt, queued: renderSlots.waiting });

  try {
    const outcome = await runFfmpeg(args, signal);
    const elapsedMs = Date.now() - startedAt;

    if (outcome.aborted) {
      throw new AppError('RENDER_FAILED', 'client disconnected during the render');
    }
    if (outcome.timedOut) {
      throw new AppError('RENDER_FAILED', `ffmpeg exceeded ${env.render.timeoutMs}ms and was killed`);
    }
    if (outcome.code !== 0) {
      log.error('ffmpeg exited non-zero', { code: outcome.code, stderr: outcome.stderrTail.slice(-1_000) });
      throw new AppError('RENDER_FAILED', `ffmpeg exited with code ${outcome.code}`);
    }

    log.info('encode finished', { outputFilename, elapsedMs });

    const validation = await validateRender(outputPath);

    // Retry only on a measured failure. Retrying on an unverified result would
    // double the work on every render in an image without ffprobe.
    if (validation.verified && !validation.valid && attempt === 0) {
      log.warn('render failed verification, retrying once', { validation });
      await fs.unlink(outputPath).catch(() => {});
      return renderOnce(options, 1);
    }

    const publicUrl = await storeVideo(outputPath, outputFilename);

    return {
      publicUrl,
      filename: outputFilename,
      durationSeconds: validation.durationSeconds ?? durationSeconds,
      validation,
    };
  } finally {
    await fs.unlink(textFile).catch(() => {});
  }
}

/** Resolve a named asset, falling back to any file of the right type. */
async function resolveAsset(assetsDir: string, name: string, extension: string): Promise<string> {
  // Names come from our own category map, but they still index into a directory:
  // basename keeps a future edit from walking out of it.
  const safeName = path.basename(name || '');
  const direct = path.join(assetsDir, safeName);
  if (safeName && (await exists(direct))) return direct;

  const files = await fs.readdir(assetsDir).catch(() => [] as string[]);
  const fallback = files.find((f) => f.toLowerCase().endsWith(extension));
  if (fallback) {
    log.warn('named asset missing, using a fallback', { requested: safeName, using: fallback });
    return path.join(assetsDir, fallback);
  }

  throw new AppError('ASSET_UNAVAILABLE', `no ${extension} asset available for "${safeName}"`);
}

async function resolveFont(assetsDir: string): Promise<string> {
  const bundled = path.join(assetsDir, 'fonts', 'Roboto-Bold.ttf');
  if (await exists(bundled)) return bundled;

  const systemFont = 'C:/Windows/Fonts/arialbd.ttf';
  if (await exists(systemFont)) return systemFont;

  return 'arial';
}
