const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputMp4 = path.join(__dirname, '..', 'public', 'assets', 'saas_dev_ide.mp4');
const fontPath = 'C:/Windows/Fonts/consola.ttf'; // Consolas monospaced font
const fontBold = 'C:/Windows/Fonts/consolab.ttf';

console.log('Generating SaaS/Dev IDE Screen Recording MP4...');

// Create code text lines file
const codeContent = [
  "import { PipelineEngine, FastModel } from '@linear/core';",
  "import { RealtimeStream } from '@linear/telemetry';",
  "",
  "// Auto-scaling UGC video compiler pipeline",
  "export async function compileViralReel(spec: ProjectSpec) {",
  "  const startTime = performance.now();",
  "  const context = await spec.extractPageSignals();",
  "",
  "  console.log(`[Linear Engine] Ingesting: ${context.domain}`);",
  "  const blueprint = await FastModel.synthesize({",
  "    model: 'gemini-1.5-pro',",
  "    temperature: 0.7,",
  "    brandAccent: context.themeColor,",
  "    socialProof: context.verifiedMetrics",
  "  });",
  "",
  "  const stream = new RealtimeStream({ fps: 30, ratio: '9:16' });",
  "  await stream.composite({",
  "    background: spec.selectedFootage,",
  "    audioSync: blueprint.beatGrid,",
  "    overlays: blueprint.kineticTypography",
  "  });",
  "",
  "  const elapsed = (performance.now() - startTime).toFixed(1);",
  "  console.log(`[Linear Engine] Video verified in ${elapsed}ms`);",
  "  return stream.publish();",
  "}",
  "",
  "// Event listener for automated deployment",
  "PipelineEngine.on('render:complete', (event) => {",
  "  telemetry.trackEvent('ugc_rendered', { id: event.id });",
  "});"
].join('\n');

const codeFile = path.join(__dirname, 'code_sample.txt');
fs.writeFileSync(codeFile, codeContent, 'utf8');

const terminalContent = [
  "➜  linear-ugc git:(main) bun run benchmark",
  "  compiling typescript v5.8.2 ...",
  "  ✔ Turbopack bundled 142 modules in 18ms",
  "  ✔ ffprobe verification: 720x1280 (9:16) passed",
  "  ✔ Audio sync latency: 0.04s [PASS]",
  "  🚀 Server listening on http://localhost:3000",
  "  [12:15:40] POST /api/chat/stream 200 (4.2ms)"
].join('\n');

const termFile = path.join(__dirname, 'term_sample.txt');
fs.writeFileSync(termFile, terminalContent, 'utf8');

const escapedFont = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
const escapedFontBold = fontBold.replace(/\\/g, '/').replace(/:/g, '\\:');
const escapedCode = codeFile.replace(/\\/g, '/').replace(/:/g, '\\:');
const escapedTerm = termFile.replace(/\\/g, '/').replace(/:/g, '\\:');

const filterComplex = [
  // 1. Base Dark IDE Editor Background (720x1280)
  `color=c=#14161D:s=720x1280:d=10:r=30[base]`,
  
  // 2. Top Window Header Bar (#1C1E26, h=56)
  `[base]drawbox=x=0:y=0:w=720:h=56:color=#1C1E26:t=fill[winbar]`,
  // Window buttons (macOS style: red, yellow, green)
  `[winbar]drawbox=x=20:y=20:w=14:h=14:color=#FF5F56:t=fill[b1]`,
  `[b1]drawbox=x=42:y=20:w=14:h=14:color=#FFBD2E:t=fill[b2]`,
  `[b2]drawbox=x=64:y=20:w=14:h=14:color=#27C93F:t=fill[b3]`,
  
  // Tab Bar (#222530)
  `[b3]drawbox=x=100:y=10:w=260:h=46:color=#242834:t=fill[tab1]`,
  `[tab1]drawtext=text='LinearCompiler.ts':fontfile='${escapedFontBold}':fontsize=18:fontcolor=#61AFEF:x=120:y=24[tabtext]`,
  `[tabtext]drawbox=x=366:y=10:w=160:h=46:color=#181A22:t=fill[tab2]`,
  `[tab2]drawtext=text='pipeline.config.ts':fontfile='${escapedFont}':fontsize=16:fontcolor=#6B7280:x=380:y=26[tabs]`,
  
  // Left Sidebar Explorer (#181A22, w=54)
  `[tabs]drawbox=x=0:y=56:w=54:h=1224:color=#181A22:t=fill[side1]`,
  `[side1]drawbox=x=14:y=76:w=26:h=26:color=#2D3344:t=fill[side2]`,
  `[side2]drawbox=x=14:y=116:w=26:h=26:color=#2D3344:t=fill[side3]`,
  
  // Line number gutter (#1A1D26, x=54, w=48)
  `[side3]drawbox=x=54:y=56:w=48:h=864:color=#1A1D26:t=fill[gutter]`,
  
  // Breadcrumb header (#1E212B, y=56, h=32)
  `[gutter]drawbox=x=102:y=56:w=618:h=32:color=#1E212B:t=fill[crumb]`,
  `[crumb]drawtext=text='src > engine > compiler > compileViralReel()':fontfile='${escapedFont}':fontsize=14:fontcolor=#8A909E:x=116:y=65[bread]`,
  
  // Active scrolling syntax code (scrolling smoothly upwards over 10s: y=100 - t*30)
  `[bread]drawtext=textfile='${escapedCode}':fontfile='${escapedFont}':fontsize=20:fontcolor=#E5E7EB:line_spacing=14:x=114:y='105 - mod(t*28, 400)'[code]`,
  
  // Glowing syntax accent highlights (simulating cyan & amber token highlights)
  `[code]drawtext=text='// Real-time UGC video compiler':fontfile='${escapedFont}':fontsize=18:fontcolor=#5C6370:x=114:y='165 - mod(t*28, 400)':enable='between(t, 0, 10)'[code2]`,
  
  // Animated blinking typing cursor in cyan
  `[code2]drawbox=x=114:y='420 - mod(t*28, 400)':w=10:h=24:color=#61AFEF:t=fill:enable='lt(mod(t, 0.8), 0.4)'[cursor]`,
  
  // Bottom Terminal Pane (#0F1116, y=920, h=360)
  `[cursor]drawbox=x=0:y=920:w=720:h=360:color=#0F1116:t=fill[termbg]`,
  `[termbg]drawbox=x=0:y=920:w=720:h=36:color=#181B24:t=fill[termheader]`,
  `[termheader]drawtext=text='TERMINAL  -  bun test --benchmark  (Active IDE Process)':fontfile='${escapedFontBold}':fontsize=15:fontcolor=#98C379:x=20:y=930[termtitle]`,
  `[termtitle]drawtext=textfile='${escapedTerm}':fontfile='${escapedFont}':fontsize=18:fontcolor=#ABB2BF:line_spacing=12:x=20:y=970[termcontent]`,
  
  // Active pulsing status dot in terminal
  `[termcontent]drawbox=x=680:y=932:w=10:h=10:color=#98C379:t=fill:enable='lt(mod(t, 1), 0.5)'[final_v]`
].join(';');

const args = [
  '-y',
  '-f', 'lavfi',
  '-i', 'nullsrc=s=720x1280:d=10:r=30',
  '-filter_complex', filterComplex,
  '-map', '[final_v]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '22',
  '-pix_fmt', 'yuv420p',
  outputMp4
];

const res = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (res.status === 0) {
  console.log('SUCCESS! Generated IDE screen recording:', outputMp4);
} else {
  console.error('FAILED with status:', res.status);
}
