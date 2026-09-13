const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'public', 'assets');
const fontPath = 'C:/Windows/Fonts/consola.ttf';
const fontBold = 'C:/Windows/Fonts/consolab.ttf';
const fontArialBold = 'C:/Windows/Fonts/arialbd.ttf';

const escapedFont = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
const escapedFontBold = fontBold.replace(/\\/g, '/').replace(/:/g, '\\:');
const escapedArialBold = fontArialBold.replace(/\\/g, '/').replace(/:/g, '\\:');

console.log('=== GENERATING ALL 4 CATEGORY BACKGROUND REELS ===');

// 1. SAAS / DEV TOOLS: Real IDE Screen Recording (saas_dev_ide.mp4)
function generateSaasIde() {
  const outputPath = path.join(assetsDir, 'saas_dev_ide.mp4');
  console.log('1/4: Generating saas_dev_ide.mp4...');

  const codeLines = [
    "// @core/runtime v3.4 - Fast Async Engine",
    "import { Engine, RealtimeClient } from '@core/runtime';",
    "import { MetricsCollector } from '@core/telemetry';",
    "",
    "export async function syncCoreWorkflow() {",
    "  const stream = new RealtimeClient({ latency: '12ms' });",
    "  const metrics = await MetricsCollector.getTelemetry();",
    "",
    "  console.log(`[Core Engine] Active events: ${metrics.count}`);",
    "  const compiler = await Engine.compileOptimized({",
    "    concurrency: 32,",
    "    autoMerge: true,",
    "    zeroConfig: true",
    "  });",
    "",
    "  return compiler.dispatchSprint();",
    "}",
    "",
    "// Continuous deployment pipeline",
    "Engine.on('workflow:sync', (event) => {",
    "  telemetry.logEvent('task_completed', { id: event.id });",
    "});"
  ].join('\n');
  const codeFile = path.join(__dirname, 'saas_code.txt');
  fs.writeFileSync(codeFile, codeLines, 'utf8');

  const termLines = [
    "➜  workspace git:(main) bun run build:telemetry",
    "  ✔ Turbopack compiled 94 modules in 14ms",
    "  ✔ Automated ffprobe check: 720x1280 (9:16) [PASSED]",
    "  ✔ Latency: 0.04s • Zero dropped frames",
    "  🚀 Server live on http://localhost:3000",
    "  [12:21:04] POST /api/chat 200 (2.8ms)"
  ].join('\n');
  const termFile = path.join(__dirname, 'saas_term.txt');
  fs.writeFileSync(termFile, termLines, 'utf8');

  const escCode = codeFile.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escTerm = termFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  const filterComplex = [
    `color=c=#13151D:s=720x1280:d=10:r=30[base]`,
    `[base]drawbox=x=0:y=0:w=720:h=60:color=#1A1D27:t=fill[hdr]`,
    `[hdr]drawbox=x=22:y=22:w=14:h=14:color=#FF5F56:t=fill[b1]`,
    `[b1]drawbox=x=44:y=22:w=14:h=14:color=#FFBD2E:t=fill[b2]`,
    `[b2]drawbox=x=66:y=22:w=14:h=14:color=#27C93F:t=fill[b3]`,
    `[b3]drawbox=x=105:y=12:w=260:h=48:color=#242836:t=fill[tab1]`,
    `[tab1]drawtext=text='WorkflowEngine.ts':fontfile='${escapedFontBold}':fontsize=18:fontcolor=#61AFEF:x=125:y=26[tabt]`,
    `[tabt]drawbox=x=0:y=60:w=56:h=1220:color=#171923:t=fill[side1]`,
    `[side1]drawbox=x=14:y=80:w=28:h=28:color=#2A2E3D:t=fill[side2]`,
    `[side2]drawbox=x=14:y=122:w=28:h=28:color=#2A2E3D:t=fill[side3]`,
    `[side3]drawbox=x=56:y=60:w=50:h=850:color=#1A1D27:t=fill[gutter]`,
    `[gutter]drawbox=x=106:y=60:w=614:h=34:color=#1C1F2B:t=fill[breadbg]`,
    `[breadbg]drawtext=text='src > workflow > WorkflowEngine.ts > syncCoreWorkflow()':fontfile='${escapedFont}':fontsize=13:fontcolor=#8A909E:x=120:y=70[bread]`,
    `[bread]drawtext=textfile='${escCode}':fontfile='${escapedFont}':fontsize=20:fontcolor=#E5E7EB:line_spacing=14:x=120:y='115 - mod(t*22, 300)'[code]`,
    `[code]drawbox=x=120:y='380 - mod(t*22, 300)':w=10:h=22:color=#61AFEF:t=fill:enable='lt(mod(t, 0.8), 0.4)'[cursor]`,
    `[cursor]drawbox=x=0:y=910:w=720:h=370:color=#0D0F14:t=fill[termbg]`,
    `[termbg]drawbox=x=0:y=910:w=720:h=38:color=#181B24:t=fill[termhdr]`,
    `[termhdr]drawtext=text='TERMINAL  -  bun run build:telemetry  (Active Process)':fontfile='${escapedFontBold}':fontsize=15:fontcolor=#98C379:x=20:y=922[termtitle]`,
    `[termtitle]drawtext=textfile='${escTerm}':fontfile='${escapedFont}':fontsize=17:fontcolor=#ABB2BF:line_spacing=12:x=20:y=960[termbody]`,
    `[termbody]drawbox=x=680:y=924:w=10:h=10:color=#98C379:t=fill:enable='lt(mod(t, 1), 0.5)'[out]`
  ].join(';');

  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'nullsrc=s=720x1280:d=10:r=30',
    '-filter_complex', filterComplex, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
    outputPath
  ], { stdio: 'inherit' });
  if (res.status === 0) console.log('✔ saas_dev_ide.mp4 successfully created!');
}

// 2. FITNESS / HEALTH: Dynamic Workout Telemetry Reel (fitness_workout.mp4)
function generateFitnessWorkout() {
  const outputPath = path.join(assetsDir, 'fitness_workout.mp4');
  console.log('2/4: Generating fitness_workout.mp4...');

  const fitTopLines = [
    "FITNESS PULSE  •  DYNAMIC NUTRITION & CARDIO SCAN",
    "CALORIC BURN: 540 kcal  |  HEART RATE: 148 BPM",
    "ACTIVE PACING: PEAK INTENSITY (SET 3 OF 4)"
  ].join('\n');
  const fitTopFile = path.join(__dirname, 'fit_top.txt');
  fs.writeFileSync(fitTopFile, fitTopLines, 'utf8');

  const fitBotLines = [
    "BIOMETRIC SCAN VERIFIED",
    "PROTEIN: 38g  •  CARBS: 45g  •  HEALTHY FATS: 14g",
    "Instant photo meal logging & dietary analytics"
  ].join('\n');
  const fitBotFile = path.join(__dirname, 'fit_bot.txt');
  fs.writeFileSync(fitBotFile, fitBotLines, 'utf8');

  const escTop = fitTopFile.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escBot = fitBotFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  const filterComplex = [
    `color=c=#0D1217:s=720x1280:d=10:r=30[base]`,
    `[base]drawbox=x=0:y=0:w=720:h=6:color=#22C55E:t=fill[topbar]`,
    `[topbar]drawbox=x=30:y=80:w=660:h=140:color=#141B22@0.92:t=fill[hudcard]`,
    `[hudcard]drawbox=x=30:y=80:w=660:h=140:color=#22C55E:t=2[hudborder]`,
    `[hudborder]drawtext=textfile='${escTop}':fontfile='${escapedArialBold}':fontsize=18:fontcolor=white:line_spacing=12:x=50:y=95[hudt]`,
    `[hudt]drawbox=x=50:y=195:w='500 + sin(t*4)*120':h=6:color=#22C55E:t=fill[bar]`,
    `[bar]drawbox=x=260:y=500:w=200:h=200:color=#161F28:t=fill[cbg]`,
    `[cbg]drawbox=x=260:y=500:w=200:h=200:color=#22C55E:t=3[cring1]`,
    `[cring1]drawbox=x=290:y=530:w=140:h=140:color=#10B981:t=2[cring2]`,
    `[cring2]drawtext=text='SCAN ACTIVE':fontfile='${escapedArialBold}':fontsize=18:fontcolor=#22C55E:x=296:y=590[cringt]`,
    `[cringt]drawbox=x=30:y=1020:w=660:h=180:color=#141B22@0.95:t=fill[bottomhud]`,
    `[bottomhud]drawbox=x=30:y=1020:w=660:h=180:color=#22C55E@0.5:t=1[bottomborder]`,
    `[bottomborder]drawtext=textfile='${escBot}':fontfile='${escapedArialBold}':fontsize=17:fontcolor=white:line_spacing=12:x=50:y=1045[b1]`,
    `[b1]drawbox=x=50:y=1155:w='300 + cos(t*3)*80':h=5:color=#10B981:t=fill[out]`
  ].join(';');

  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'nullsrc=s=720x1280:d=10:r=30',
    '-filter_complex', filterComplex, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
    outputPath
  ], { stdio: 'inherit' });
  if (res.status === 0) console.log('✔ fitness_workout.mp4 successfully created!');
}

// 3. FOOD / BEVERAGE / DTC: Culinary & Aesthetic Kitchen Reel (food_culinary.mp4)
function generateFoodCulinary() {
  const outputPath = path.join(assetsDir, 'food_culinary.mp4');
  console.log('3/4: Generating food_culinary.mp4...');

  const foodTopLines = [
    "CRAFT REFRESHMENT  •  COLD-PRESSED & ORGANIC",
    "PLANT FIBER + PREBIOTIC BOTANICALS",
    "Zero artificial ingredients • 9g dietary fiber per can"
  ].join('\n');
  const foodTopFile = path.join(__dirname, 'food_top.txt');
  fs.writeFileSync(foodTopFile, foodTopLines, 'utf8');

  const foodBotLines = [
    "CRITICALLY ACCLAIMED FORMULATION",
    "VINTAGE COLA  •  CRISP APPLE  •  LEMON LIME",
    "Delicious nostalgia with modern functional nutrition"
  ].join('\n');
  const foodBotFile = path.join(__dirname, 'food_bot.txt');
  fs.writeFileSync(foodBotFile, foodBotLines, 'utf8');

  const escTop = foodTopFile.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escBot = foodBotFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  const filterComplex = [
    `color=c=#1A120E:s=720x1280:d=10:r=30[base]`,
    `[base]drawbox=x=0:y=0:w=720:h=8:color=#F97316:t=fill[accent]`,
    `[accent]drawbox=x=30:y=70:w=660:h=150:color=#241813@0.92:t=fill[card1]`,
    `[card1]drawbox=x=30:y=70:w=660:h=150:color=#F97316:t=2[card1b]`,
    `[card1b]drawtext=textfile='${escTop}':fontfile='${escapedArialBold}':fontsize=18:fontcolor=white:line_spacing=12:x=50:y=95[h1]`,
    `[h1]drawbox=x=235:y=480:w=250:h=250:color=#2E1D17:t=fill[spotlight]`,
    `[spotlight]drawbox=x=235:y=480:w=250:h=250:color=#FB923C:t=3[spotlightb]`,
    `[spotlightb]drawtext=text='MODERN SODA':fontfile='${escapedArialBold}':fontsize=20:fontcolor=#FED7AA:x=270:y=580[st]`,
    `[st]drawtext=text='FLAVOR VERIFIED':fontfile='${escapedArialBold}':fontsize=14:fontcolor=#F97316:x=285:y=615[st2]`,
    `[st2]drawbox=x=30:y=1020:w=660:h=180:color=#241813@0.95:t=fill[botcard]`,
    `[botcard]drawbox=x=30:y=1020:w=660:h=180:color=#F97316@0.6:t=1[botcardb]`,
    `[botcardb]drawtext=textfile='${escBot}':fontfile='${escapedArialBold}':fontsize=17:fontcolor=white:line_spacing=12:x=50:y=1045[bh1]`,
    `[bh1]drawbox=x=50:y=1155:w='360 + sin(t*3)*90':h=5:color=#F97316:t=fill[out]`
  ].join(';');

  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'nullsrc=s=720x1280:d=10:r=30',
    '-filter_complex', filterComplex, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
    outputPath
  ], { stdio: 'inherit' });
  if (res.status === 0) console.log('✔ food_culinary.mp4 successfully created!');
}

// 4. TECH ABSTRACT / FINTECH / ECOMMERCE (tech_abstract.mp4)
function generateTechAbstract() {
  const outputPath = path.join(assetsDir, 'tech_abstract.mp4');
  console.log('4/4: Generating tech_abstract.mp4...');

  const topLines = [
    "FINANCIAL ENGINE  •  REAL-TIME CONVERSION",
    "ANNUAL RUN RATE: 4.2M USD (UP 142% YoY)",
    "Instant global settlements • 99.999% uptime SLA"
  ].join('\n');
  const topFile = path.join(__dirname, 'tech_top.txt');
  fs.writeFileSync(topFile, topLines, 'utf8');

  const botLines = [
    "HIGH VELOCITY METRICS",
    "ACTIVE CUSTOMERS: 42,000+  •  NET CHURN: -1.2%",
    "Zero-latency transaction throughput verified"
  ].join('\n');
  const botFile = path.join(__dirname, 'tech_bot.txt');
  fs.writeFileSync(botFile, botLines, 'utf8');

  const escTop = topFile.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escBot = botFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  const filterComplex = [
    `color=c=#0B0D14:s=720x1280:d=10:r=30[base]`,
    `[base]drawbox=x=0:y=0:w=720:h=6:color=#3B82F6:t=fill[accent]`,
    `[accent]drawbox=x=30:y=70:w=660:h=140:color=#131826@0.92:t=fill[card1]`,
    `[card1]drawbox=x=30:y=70:w=660:h=140:color=#3B82F6:t=2[card1b]`,
    `[card1b]drawtext=textfile='${escTop}':fontfile='${escapedArialBold}':fontsize=18:fontcolor=white:line_spacing=12:x=50:y=95[h1]`,
    `[h1]drawbox=x=250:y=490:w=220:h=220:color=#171F33:t=fill[spotlight]`,
    `[spotlight]drawbox=x=250:y=490:w=220:h=220:color=#3B82F6:t=3[spotlightb]`,
    `[spotlightb]drawtext=text='REVENUE ENGINE':fontfile='${escapedArialBold}':fontsize=18:fontcolor=#93C5FD:x=272:y=590[st]`,
    `[st]drawtext=text='LIVE STREAMING':fontfile='${escapedArialBold}':fontsize=14:fontcolor=#3B82F6:x=290:y=625[st2]`,
    `[st2]drawbox=x=30:y=1020:w=660:h=180:color=#131826@0.95:t=fill[botcard]`,
    `[botcard]drawbox=x=30:y=1020:w=660:h=180:color=#3B82F6@0.6:t=1[botcardb]`,
    `[botcardb]drawtext=textfile='${escBot}':fontfile='${escapedArialBold}':fontsize=17:fontcolor=white:line_spacing=12:x=50:y=1045[bh1]`,
    `[bh1]drawbox=x=50:y=1155:w='340 + cos(t*3)*80':h=5:color=#3B82F6:t=fill[out]`
  ].join(';');

  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'nullsrc=s=720x1280:d=10:r=30',
    '-filter_complex', filterComplex, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
    outputPath
  ], { stdio: 'inherit' });
  if (res.status === 0) console.log('✔ tech_abstract.mp4 successfully created!');
}

generateSaasIde();
generateFitnessWorkout();
generateFoodCulinary();
generateTechAbstract();
console.log('=== ALL 4 CATEGORY BACKGROUNDS COMPLETED SUCCESSFULLY! ===');
