const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'public', 'assets');
const bgVideo = path.join(assetsDir, 'saas_dev_ide.mp4');
const gifPath = path.join(assetsDir, 'gifs', 'mind-blown.gif');
const audioTrack = path.join(assetsDir, 'mixkit-driving-ambition-32.mp3');
const outputPath = path.join(__dirname, 'test_layered_render.mp4');

const textContent = "Stop managing sprint issues manually.\nLinear compiles workflows 10x faster with 0 lag.";
const textFile = path.join(__dirname, 'test_hook.txt');
fs.writeFileSync(textFile, textContent, 'utf8');

const fontPath = 'C:/Windows/Fonts/arialbd.ttf';
const escFont = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
const escText = textFile.replace(/\\/g, '/').replace(/:/g, '\\:');

const brandColor = '0xFF6B00'; // Amber

// Filter complex with 4 crystal-clear separated layers:
// 1. Background IDE Video (full 720x1280)
// 2. Text Overlay (upper third, y=170)
// 3. Floating GIF Meme Card with border (lower-middle, y=660, width=320)
// 4. Audio soundtrack
const filterComplex = [
  // Trim & scale background
  `[0:v]trim=duration=7,scale=720:1280,setpts=PTS-STARTPTS[bg]`,
  
  // Scale reaction GIF to compact sticker width (320px)
  `[1:v]scale=320:-1[gif]`,
  
  // Overlay GIF onto background at y=660 (centered horizontally)
  `[bg][gif]overlay=x=(W-w)/2:y=660:shortest=1[comp1]`,
  
  // Draw sleek card frame around the GIF sticker
  `[comp1]drawbox=x=(720-320)/2-4:y=656:w=328:h=248:color=${brandColor}:t=3[comp2]`,
  
  // Draw sticker label pill above the GIF: "REACTION MEME"
  `[comp2]drawbox=x=(720-160)/2:y=632:w=160:h=26:color=black@0.85:t=fill[comp3]`,
  `[comp3]drawtext=text='REACTION':fontfile='${escFont}':fontsize=13:fontcolor=${brandColor}:x=(720-70)/2:y=638[comp4]`,
  
  // Draw kinetic hook text overlay at upper third (y=160)
  `[comp4]drawtext=textfile='${escText}':fontfile='${escFont}':fontsize=36:fontcolor=white:borderw=3:bordercolor=${brandColor}:box=1:boxcolor=black@0.82:boxborderw=14:line_spacing=12:x=(w-text_w)/2:y=170[v]`,
  
  // Fade audio out at 6s
  `[2:a]afade=t=out:st=6:d=1[a]`
].join(';');

const args = [
  '-y',
  '-t', '7',
  '-i', bgVideo,
  '-ignore_loop', '0',
  '-t', '7',
  '-i', gifPath,
  '-t', '7',
  '-i', audioTrack,
  '-filter_complex', filterComplex,
  '-map', '[v]',
  '-map', '[a]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '24',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  outputPath
];

console.log('Rendering test layered video...');
const res = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (res.status === 0) {
  console.log('SUCCESS: Rendered', outputPath);
  // Extract test frame at 3 seconds
  const thumbPath = 'C:/Users/i222683AbdullahGhani/.gemini/antigravity-cli/brain/f7142284-3b93-4b91-9bb8-4de68820b42c/test_layered_frame.jpg';
  spawnSync('ffmpeg', ['-y', '-ss', '00:00:03', '-i', outputPath, '-vframes', '1', thumbPath], { stdio: 'inherit' });
  console.log('Extracted frame to', thumbPath);
} else {
  console.error('FAILED with code:', res.status);
}
