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

// 1. FITNESS CARDIO / HIIT SPRINT
function generateFitnessCardio() {
  const outputPath = path.join(assetsDir, 'fitness_cardio.mp4');
  console.log('Generating fitness_cardio.mp4...');

  const topLines = [
    "HIIT CARDIO INTERVALS  •  ZONE 4 THRESHOLD",
    "PACE: 4:15 /km  |  ACTIVE CADENCE: 172 SPM",
    "MAX VO2 ESTIMATE: 52 mL/kg/min"
  ].join('\n');
  const topFile = path.join(__dirname, 'fit_cardio_top.txt');
  fs.writeFileSync(topFile, topLines, 'utf8');

  const botLines = [
    "METABOLIC RECOVERY TRACKING",
    "TARGET REACHED: 85% PEAK OUTPUT",
    "Syncing real-time biometric telemetry"
  ].join('\n');
  const botFile = path.join(__dirname, 'fit_cardio_bot.txt');
  fs.writeFileSync(botFile, botLines, 'utf8');

  const escTop = topFile.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escBot = botFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  const filterComplex = [
    `color=c=#0B1015:s=720x1280:d=10:r=30[base]`,
    `[base]drawbox=x=0:y=0:w=720:h=6:color=#06B6D4:t=fill[topbar]`,
    `[topbar]drawbox=x=30:y=80:w=660:h=140:color=#101822@0.92:t=fill[hudcard]`,
    `[hudcard]drawbox=x=30:y=80:w=660:h=140:color=#06B6D4:t=2[hudborder]`,
    `[hudborder]drawtext=textfile='${escTop}':fontfile='${escapedArialBold}':fontsize=18:fontcolor=white:line_spacing=12:x=50:y=95[hudt]`,
    `[hudt]drawbox=x=50:y=195:w='480 + cos(t*5)*100':h=6:color=#06B6D4:t=fill[bar]`,
    `[bar]drawbox=x=250:y=490:w=220:h=220:color=#131D2A:t=fill[cbg]`,
    `[cbg]drawbox=x=250:y=490:w=220:h=220:color=#06B6D4:t=3[cring1]`,
    `[cring1]drawtext=text='172 BPM':fontfile='${escapedArialBold}':fontsize=32:fontcolor=#38BDF8:x=280:y=565[bpmt]`,
    `[bpmt]drawtext=text='ANAEROBIC PEAK':fontfile='${escapedArialBold}':fontsize=14:fontcolor=#06B6D4:x=290:y=615[peakt]`,
    `[peakt]drawbox=x=30:y=1020:w=660:h=180:color=#101822@0.95:t=fill[bottomhud]`,
    `[bottomhud]drawbox=x=30:y=1020:w=660:h=180:color=#06B6D4@0.5:t=1[bottomborder]`,
    `[bottomborder]drawtext=textfile='${escBot}':fontfile='${escapedArialBold}':fontsize=17:fontcolor=white:line_spacing=12:x=50:y=1045[b1]`,
    `[b1]drawbox=x=50:y=1155:w='320 + sin(t*4)*70':h=5:color=#38BDF8:t=fill[out]`
  ].join(';');

  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'nullsrc=s=720x1280:d=10:r=30',
    '-filter_complex', filterComplex, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
    outputPath
  ], { stdio: 'inherit' });
  if (res.status === 0) console.log('✔ fitness_cardio.mp4 successfully created!');
}

// 2. SAAS / DEV TOOLS: Cloud Cluster & Terminal Deployment
function generateSaasTerminal() {
  const outputPath = path.join(assetsDir, 'saas_dev_terminal.mp4');
  console.log('Generating saas_dev_terminal.mp4...');

  const codeLines = [
    "# Kubernetes Deployment manifest - Production Cluster",
    "apiVersion: apps/v1",
    "kind: Deployment",
    "metadata:",
    "  name: realtime-inference-worker",
    "  labels:",
    "    tier: core-mesh",
    "spec:",
    "  replicas: 16",
    "  strategy:",
    "    rollingUpdate:",
    "      maxSurge: 25%",
    "  template:",
    "    spec:",
    "      containers:",
    "      - name: worker",
    "        image: registry.internal/worker:v4.8",
    "        resources:",
    "          limits:",
    "            cpu: 4000m",
    "            memory: 8Gi"
  ].join('\n');
  const codeFile = path.join(__dirname, 'saas_k8s.txt');
  fs.writeFileSync(codeFile, codeLines, 'utf8');

  const termLines = [
    "➜  infra/deploy git:(main) kubectl rollout status deploy/worker",
    "  Waiting for deployment \"realtime-inference-worker\" rollout to finish: 16 of 16 updated replicas are available...",
    "  ✔ deployment \"realtime-inference-worker\" successfully rolled out",
    "  ✔ Edge latency: 8ms (p99: 14ms) • 0 errors detected",
    "  🚀 All microservices operational across 3 regions"
  ].join('\n');
  const termFile = path.join(__dirname, 'saas_k8s_term.txt');
  fs.writeFileSync(termFile, termLines, 'utf8');

  const escCode = codeFile.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escTerm = termFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  const filterComplex = [
    `color=c=#0E1117:s=720x1280:d=10:r=30[base]`,
    `[base]drawbox=x=0:y=0:w=720:h=6:color=#161B22:t=fill[hdr]`,
    `[hdr]drawbox=x=22:y=22:w=14:h=14:color=#FF5F56:t=fill[b1]`,
    `[b1]drawbox=x=44:y=22:w=14:h=14:color=#FFBD2E:t=fill[b2]`,
    `[b2]drawbox=x=66:y=22:w=14:h=14:color=#27C93F:t=fill[b3]`,
    `[b3]drawbox=x=105:y=12:w=280:h=48:color=#1F242C:t=fill[tab1]`,
    `[tab1]drawtext=text='deploy-worker.yaml':fontfile='${escapedFontBold}':fontsize=18:fontcolor=#A5D6FF:x=125:y=26[tabt]`,
    `[tabt]drawbox=x=0:y=60:w=56:h=1220:color=#12161D:t=fill[side1]`,
    `[side1]drawbox=x=14:y=80:w=28:h=28:color=#21262D:t=fill[side2]`,
    `[side2]drawbox=x=56:y=60:w=50:h=850:color=#161B22:t=fill[gutter]`,
    `[gutter]drawbox=x=106:y=60:w=614:h=34:color=#181D25:t=fill[breadbg]`,
    `[breadbg]drawtext=text='k8s > production > deploy-worker.yaml':fontfile='${escapedFont}':fontsize=13:fontcolor=#8B949E:x=120:y=70[bread]`,
    `[bread]drawtext=textfile='${escCode}':fontfile='${escapedFont}':fontsize=20:fontcolor=#E6EDF3:line_spacing=14:x=120:y='115 - mod(t*20, 260)'[code]`,
    `[code]drawbox=x=0:y=910:w=720:h=370:color=#0B0D11:t=fill[termbg]`,
    `[termbg]drawbox=x=0:y=910:w=720:h=38:color=#161B22:t=fill[termhdr]`,
    `[termhdr]drawtext=text='KUBECTL CLUSTER TELEMETRY (US-EAST-1)':fontfile='${escapedFontBold}':fontsize=15:fontcolor=#58A6FF:x=20:y=922[termtitle]`,
    `[termtitle]drawtext=textfile='${escTerm}':fontfile='${escapedFont}':fontsize=16:fontcolor=#C9D1D9:line_spacing=12:x=20:y=960[termbody]`,
    `[termbody]drawbox=x=680:y=924:w=10:h=10:color=#58A6FF:t=fill:enable='lt(mod(t, 1), 0.5)'[out]`
  ].join(';');

  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'nullsrc=s=720x1280:d=10:r=30',
    '-filter_complex', filterComplex, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
    outputPath
  ], { stdio: 'inherit' });
  if (res.status === 0) console.log('✔ saas_dev_terminal.mp4 successfully created!');
}

generateFitnessCardio();
generateSaasTerminal();
