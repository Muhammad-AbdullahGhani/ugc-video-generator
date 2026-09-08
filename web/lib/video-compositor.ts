import { spawn } from 'child_process';
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
}

export interface RenderResult {
  publicUrl: string;
  filename: string;
  duration: number;
}

function wrapText(text: string, maxLineLength = 28): string {
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

export async function renderUgcVideo(options: RenderOptions): Promise<RenderResult> {
  const {
    backgroundVideoName,
    audioTrackName,
    gifPath,
    hookText,
    durationSeconds = 7,
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

  // Build filter complex for crisp, fast-rendering 720x1280 vertical video
  const filterComplex = [
    `[0:v]trim=duration=${durationSeconds},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setpts=PTS-STARTPTS[bg]`,
    `[1:v]scale=460:-1[gif]`,
    `[bg][gif]overlay=(W-w)/2:(H-h)/2+50:shortest=1[comp1]`,
    `[comp1]drawtext=textfile='${escapedTextPath}':fontfile='${escapedFontPath}':fontsize=38:fontcolor=white:borderw=3:bordercolor=black:box=1:boxcolor=black@0.65:boxborderw=14:line_spacing=12:x=(w-text_w)/2:y=(h-text_h)/3-70[v]`,
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

  console.log(`[FFmpeg] Starting video assembly for ${outputFilename}...`);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const ffmpegCmd = getFfmpegPath();
    console.log(`[FFmpeg] Executing: ${ffmpegCmd}`);
    const proc = spawn(ffmpegCmd, args);
    let stderr = '';

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err) => {
      // Clean up text file
      if (fs.existsSync(textFile)) fs.unlinkSync(textFile);
      reject(new Error(`Failed to spawn FFmpeg (${ffmpegCmd}): ${err.message}`));
    });

    proc.on('close', async (code) => {
      // Clean up text file
      if (fs.existsSync(textFile)) {
        try {
          fs.unlinkSync(textFile);
        } catch {}
      }

      if (code === 0 && fs.existsSync(outputPath)) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[FFmpeg] Video rendered successfully in ${elapsed}s: ${outputFilename}`);
        
        let publicUrl = `/api/video/${outputFilename}`;
        try {
          publicUrl = await storeVideo(outputPath, outputFilename);
        } catch (storageErr) {
          console.warn('[FFmpeg] storeVideo failed, using local route fallback:', storageErr);
        }

        resolve({
          publicUrl,
          filename: outputFilename,
          duration: durationSeconds,
        });
      } else {
        console.error('[FFmpeg] Error output:', stderr.slice(-1000));
        reject(new Error(`FFmpeg exited with code ${code}. Check logs for details.`));
      }
    });
  });
}
