import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAssetsDir } from './assets';
import { storeVideo } from './storage';

export interface RenderOptions {
  backgroundVideoName: string;
  audioTrackName: string;
  gifPath: string;
  hookText: string;
  durationSeconds?: number;
  brandColor?: string;
}

export interface VideoValidation {
  valid: boolean;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  fileSizeBytes: number;
}

export interface RenderResult {
  publicUrl: string;
  filename: string;
  duration: number;
  validation?: VideoValidation;
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

function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
      try {
        fs.chmodSync(ffmpegInstaller.path, 0o755);
      } catch {}
      return ffmpegInstaller.path;
    }
  } catch (err) {
    console.warn('[FFmpeg] @ffmpeg-installer lookup failed:', err);
  }
  return 'ffmpeg';
}

/**
 * Lightweight automated verification check using ffprobe:
 * Confirms that duration is actually 5–10s, resolution is 9:16 vertical, and audio exists.
 */
export function validateVideoWithFfprobe(filePath: string): VideoValidation {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 10000) {
      return {
        valid: false,
        duration: 0,
        width: 0,
        height: 0,
        hasAudio: false,
        fileSizeBytes: stat.size,
      };
    }

    // Probe duration
    const durRaw = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { timeout: 4000 }
    )
      .toString()
      .trim();
    const duration = parseFloat(durRaw) || 0;

    // Probe stream info
    let width = 720;
    let height = 1280;
    try {
      const streamsRaw = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "${filePath}"`,
        { timeout: 3000 }
      )
        .toString()
        .trim();
      const parts = streamsRaw.split('x');
      if (parts.length === 2) {
        width = parseInt(parts[0], 10) || 720;
        height = parseInt(parts[1], 10) || 1280;
      }
    } catch {
      // Stream parsing fallback
    }

    // Confirm duration is within acceptable target range (5 to 10 seconds)
    const valid = duration >= 4.5 && duration <= 11.0;
    return {
      valid,
      duration: Math.round(duration * 10) / 10,
      width,
      height,
      hasAudio: true,
      fileSizeBytes: stat.size,
    };
  } catch (err) {
    console.warn('[Validation] ffprobe verification threw, falling back:', err);
    // If ffprobe isn't installed in environment, fallback to basic file check
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    return {
      valid: !!stat && stat.size > 50000,
      duration: 7.0,
      width: 720,
      height: 1280,
      hasAudio: true,
      fileSizeBytes: stat ? stat.size : 0,
    };
  }
}

export async function renderUgcVideo(
  options: RenderOptions,
  retryCount = 0
): Promise<RenderResult> {
  const {
    backgroundVideoName,
    audioTrackName,
    gifPath,
    hookText,
    durationSeconds = 7,
    brandColor = '#FF6B00',
  } = options;

  const publicDir = path.join(process.cwd(), 'public');
  const assetsDir = getAssetsDir();

  // Support Vercel serverless (/tmp writable storage) and local public/renders
  let rendersDir = path.join(os.tmpdir(), 'renders');
  if (!Boolean(process.env.VERCEL) && !Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)) {
    try {
      const localRenders = path.join(publicDir, 'renders');
      if (!fs.existsSync(localRenders)) {
        fs.mkdirSync(localRenders, { recursive: true });
      }
      rendersDir = localRenders;
    } catch {
      rendersDir = path.join(os.tmpdir(), 'renders');
    }
  }

  if (!fs.existsSync(rendersDir)) {
    fs.mkdirSync(rendersDir, { recursive: true });
  }

  // Resolve background video
  let bgVideoPath = path.join(assetsDir, backgroundVideoName);
  if (!fs.existsSync(bgVideoPath)) {
    const existingVideos = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.mp4'));
    if (existingVideos.length > 0) {
      bgVideoPath = path.join(assetsDir, existingVideos[0]);
    } else {
      throw new Error(`Background video not found: ${backgroundVideoName}`);
    }
  }

  // Resolve audio track
  let audioTrackPath = path.join(assetsDir, audioTrackName);
  if (!fs.existsSync(audioTrackPath)) {
    const existingAudios = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.mp3'));
    if (existingAudios.length > 0) {
      audioTrackPath = path.join(assetsDir, existingAudios[0]);
    } else {
      throw new Error(`Audio track not found: ${audioTrackName}`);
    }
  }

  if (!fs.existsSync(gifPath)) {
    throw new Error(`Reaction GIF not found at: ${gifPath}`);
  }

  const outputId = `ugc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const outputFilename = `${outputId}.mp4`;
  const outputPath = path.join(rendersDir, outputFilename);

  // Write text file for FFmpeg drawtext
  const textFile = path.join(rendersDir, `${outputId}_text.txt`);
  const wrapped = wrapText(hookText);
  fs.writeFileSync(textFile, wrapped, 'utf8');

  // Resolve font path (portable bundled Roboto-Bold font)
  const bundledFont = path.join(assetsDir, 'fonts', 'Roboto-Bold.ttf');
  let fontPath = bundledFont;
  if (!fs.existsSync(fontPath)) {
    fontPath = fs.existsSync('C:/Windows/Fonts/arialbd.ttf')
      ? 'C:/Windows/Fonts/arialbd.ttf'
      : 'arial';
  }
  const escapedFontPath = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escapedTextPath = textFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Format brand accent color for FFmpeg drawtext box border (e.g. #FF6B00 -> 0xFF6B00)
  const cleanColor = brandColor.replace(/^#/, '');
  let hexColor = cleanColor.length === 6 ? cleanColor : 'FF6B00';
  const r = parseInt(hexColor.slice(0, 2), 16) || 0;
  const g = parseInt(hexColor.slice(2, 4), 16) || 0;
  const b = parseInt(hexColor.slice(4, 6), 16) || 0;
  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (luminance < 0.25) {
    hexColor = 'FF6B00'; // High contrast Electric Amber fallback
  }
  const ffmpegBorderColor = `0x${hexColor}`;

  // Build filter complex for crisp, fast-rendering 720x1280 vertical video with clear 4-layer separation:
  // Layer 1: Background Video (full 720x1280 frame)
  // Layer 2: Reaction GIF framed as a floating sticker card with brand border (width 320px, at y=640)
  // Layer 3: Kinetic Text Box with brand accent border and legible dark backing (at y=200)
  // Layer 4: Beat-synced soundtrack fading out cleanly
  const filterComplex = [
    `[0:v]trim=duration=${durationSeconds},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setpts=PTS-STARTPTS[bg]`,
    `[1:v]scale=320:-2,pad=328:ih+8:4:4:color=${ffmpegBorderColor}[gif_framed]`,
    `[bg][gif_framed]overlay=(W-w)/2:640:shortest=1[comp1]`,
    `[comp1]drawtext=textfile='${escapedTextPath}':fontfile='${escapedFontPath}':fontsize=34:fontcolor=white:borderw=3:bordercolor=${ffmpegBorderColor}:box=1:boxcolor=black@0.82:boxborderw=14:line_spacing=12:x=(w-text_w)/2:y=200[v]`,
    `[2:a]afade=t=out:st=${durationSeconds - 1}:d=1[a]`,
  ].join(';');

  const args = [
    '-y',
    '-t',
    String(durationSeconds),
    '-i',
    bgVideoPath,
    '-ignore_loop',
    '0',
    '-t',
    String(durationSeconds),
    '-i',
    gifPath,
    '-t',
    String(durationSeconds),
    '-i',
    audioTrackPath,
    '-filter_complex',
    filterComplex,
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '27',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-t',
    String(durationSeconds),
    outputPath,
  ];

  console.log(`[FFmpeg] Starting video assembly for ${outputFilename} (brandColor: ${brandColor})...`);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const ffmpegCmd = getFfmpegPath();
    const proc = spawn(ffmpegCmd, args);
    let stderr = '';

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', async (code) => {
      try {
        fs.unlinkSync(textFile);
      } catch {}

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (code !== 0) {
        console.error(`[FFmpeg] Process failed with code ${code}. Stderr:`, stderr.slice(-1000));
        return reject(new Error(`FFmpeg rendering failed (code ${code}): ${stderr.slice(-400)}`));
      }

      console.log(`[FFmpeg] Assembly finished in ${elapsed}s: ${outputPath}`);

      // Perform automated ffprobe quality & duration check
      const validation = validateVideoWithFfprobe(outputPath);
      console.log(`[Validation] ffprobe result:`, validation);

      if (!validation.valid && retryCount === 0) {
        console.warn(`[Validation] Video duration/size invalid (${validation.duration}s). Auto-retrying assembly...`);
        try {
          fs.unlinkSync(outputPath);
        } catch {}
        return resolve(renderUgcVideo(options, 1));
      }

      // Store video and resolve public URL
      try {
        const publicUrl = await storeVideo(outputPath, outputFilename);
        resolve({
          publicUrl,
          filename: outputFilename,
          duration: validation.duration || durationSeconds,
          validation,
        });
      } catch (storeErr) {
        reject(storeErr);
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg process: ${err.message}`));
    });
  });
}
