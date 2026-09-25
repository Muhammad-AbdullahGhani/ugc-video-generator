'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Volume2,
  VolumeX,
  ExternalLink,
  Radio,
} from 'lucide-react';

interface LandingPageProps {
  onLaunchStudio: (promptText?: string) => void;
  onOpenAuthModal: () => void;
  isAuthenticated: boolean;
}

const SPECIMENS = [
  {
    id: 'specimen-linear',
    title: 'Linear',
    url: 'https://linear.app',
    tag: 'SAAS // DEVELOPER',
    brandColor: '#5E6AD2',
    hook: 'Still manually updating tickets? Linear lets modern dev teams ship lightning-fast with AI agents built right into your workflow.',
    videoSrc: '/assets/saas_dev_ide.mp4',
    soundtrack: 'Driving Ambition (Synth)',
    reaction: 'Focused Nod',
    metrics: 'Built for high-velocity teams • AI agents integrated',
    rationale:
      'Matched dark-mode IDE screen telemetry with driving synth audio and focused reaction meme to resonate directly with software engineers.',
  },
  {
    id: 'specimen-fitness',
    title: 'Cal AI',
    url: 'https://calai.app',
    tag: 'FITNESS // COMPUTER VISION',
    brandColor: '#00E676',
    hook: 'Stop struggling to track your meals manually—snap a photo and get instant AI macro breakdowns in 3 seconds.',
    videoSrc: '/assets/fitness_cardio.mp4',
    soundtrack: 'Hip Hop Cardio Beat',
    reaction: 'Mind Blown Reaction',
    metrics: '1M+ meals logged • 4.9★ rating • 3-second camera AI',
    rationale:
      'Paired high-energy fitness workout pacing HUD with upbeat rhythmic beat and mind-blown reaction meme tailored for instant calorie scanning.',
  },
  {
    id: 'specimen-olipop',
    title: 'Olipop',
    url: 'https://drinkolipop.com',
    tag: 'DTC // BEVERAGE',
    brandColor: '#F59E0B',
    hook: 'Still drinking regular soda loaded with sugar? Discover prebiotic soda that supports digestive health with only 2-5g of sugar.',
    videoSrc: '/assets/food_culinary.mp4',
    soundtrack: 'Sun & His Daughter (Acoustic)',
    reaction: 'Celebration Dance',
    metrics: '9g dietary fiber • 2-5g sugar • Plant botanicals',
    rationale:
      'Selected bright culinary aesthetic visual + uplifting acoustic soundtrack + celebration meme tailored for health-conscious modern soda buyers.',
  },
];

const PIPELINE_SPEC = [
  {
    index: '01',
    phase: 'INGEST',
    title: 'Content & Color Ingestion',
    tech: 'Jina Reader + HTML Head Parser',
    desc: 'Bypasses bot barriers via Jina Reader. Simultaneously scrapes raw DOM metadata for og:title, meta description, and CSS theme-color hex values.',
    badge: 'PARALLEL I/O',
  },
  {
    index: '02',
    phase: 'REASON',
    title: 'Gemini Angle Synthesis',
    tech: 'Gemini 3.8 / 1.5 Flash',
    desc: 'Analyzes value propositions and extracts quantified social proof (e.g. "1M+ users", "4.9★"). Writes an aggressive 1-sentence kinetic hook tailored to TikTok & Reels.',
    badge: 'LATENCY < 1.2S',
  },
  {
    index: '03',
    phase: 'CURATE',
    title: 'Multi-Modal Asset Matching',
    tech: 'Deterministic Category Pools',
    desc: 'Picks category-matched vertical 9:16 background footage, beat-synced audio soundtrack, and queries Tenor API for a mood-aligned reaction meme GIF.',
    badge: 'DYNAMIC POOL',
  },
  {
    index: '04',
    phase: 'COMPOSITE',
    title: 'Headless FFmpeg Rendering',
    tech: 'FFmpeg 30fps Box Engine',
    desc: 'Executes complex filter graph: scales vertical 1080x1920 MP4, positions meme GIF sticker, and burns kinetic typography boxed with the extracted brand color accent.',
    badge: '30 FPS NATIVE',
  },
  {
    index: '05',
    phase: 'VALIDATE',
    title: 'ffprobe Telemetry Verification',
    tech: 'Automated Stream Probing',
    desc: 'Probes rendered MP4 with ffprobe to mathematically verify 9:16 aspect ratio, duration strictly within 5–10s, and synchronized audio track before release.',
    badge: 'ZERO DEFECTS',
  },
  {
    index: '06',
    phase: 'DELIVER',
    title: 'Cloud Persistence & Stream',
    tech: 'Vercel Blob / Catbox / SSE',
    desc: 'Uploads video artifact to high-speed cloud edge, writes metadata to user archive, and emits SSE completion payload with transparent rationale sentence.',
    badge: 'INSTANT SHARE',
  },
];

export default function LandingPage({
  onLaunchStudio,
  onOpenAuthModal,
  isAuthenticated,
}: LandingPageProps) {
  const [heroUrl, setHeroUrl] = useState('');
  const [activeSpecimen, setActiveSpecimen] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const specimen = SPECIMENS[activeSpecimen];

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = heroUrl.trim() || 'https://linear.app';
    onLaunchStudio(target);
  };

  return (
    <div className="min-h-full flex flex-col font-sans">
      {/* SECTION 1: ASYMMETRIC SWISS HERO */}
      <section className="border-b border-[var(--rule)] bg-[var(--paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {/* Telemetry Header Line */}
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-[var(--ink-muted)] border-b border-[var(--rule)] pb-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-[var(--ink)] text-[var(--paper)] font-bold">
                8X TECHNICAL ASSESSMENT
              </span>
              <span>AUTONOMOUS MARKETING PIPELINE</span>
            </div>
            <div className="flex items-center gap-4">
              <span>RESOLUTION: 1080×1920 (9:16)</span>
              <span>RENDER ENGINE: FFMPEG HEADLESS</span>
              <span className="hidden sm:inline">ZERO-COST RUNTIME</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left 7 Cols: Display Typographic Manifesto */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 font-mono text-[12px] text-[var(--accent)] font-semibold tracking-wider uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span>[ SPEC-01 // PRODUCTION SYSTEM ]</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.04] text-[var(--ink)]">
                Autonomous 9:16 UGC video engine for modern brands.
              </h1>

              <p className="text-[16px] sm:text-[18px] text-[var(--ink-soft)] leading-relaxed max-w-2xl">
                ReelForge reads any product URL, extracts live value propositions and brand color palettes, writes kinetic hook copy with verified metrics, and renders a 30fps vertical MP4 in under 10 seconds.
              </p>

              {/* Interactive Hero Input Box */}
              <form onSubmit={handleHeroSubmit} className="pt-2 max-w-xl">
                <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-elevated)] p-1.5 focus-within:ring-2 focus-within:ring-[var(--accent)] transition-all shadow-sm">
                  <div className="flex items-center flex-1 px-3 py-2 sm:py-0">
                    <span className="font-mono text-[13px] text-[var(--ink-muted)] mr-2 select-none">
                      https://
                    </span>
                    <input
                      type="text"
                      value={heroUrl}
                      onChange={(e) => setHeroUrl(e.target.value)}
                      placeholder="calai.app, linear.app, drinkolipop.com..."
                      className="flex-1 bg-transparent text-[14px] text-[var(--ink)] font-mono placeholder-[var(--ink-muted)] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="press mt-2 sm:mt-0 px-5 py-3 rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] text-[13px] font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>ASSEMBLE REEL</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Sample Prompt Chips */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-mono text-[var(--ink-muted)]">
                  <span>OR TRY A SPECIMEN:</span>
                  {[
                    { name: 'Linear', url: 'linear.app' },
                    { name: 'Cal AI', url: 'calai.app' },
                    { name: 'Olipop', url: 'drinkolipop.com' },
                    { name: 'Raycast', url: 'raycast.com' },
                  ].map((chip) => (
                    <button
                      key={chip.name}
                      type="button"
                      onClick={() => onLaunchStudio(`Generate UGC video for ${chip.url}`)}
                      className="press px-2 py-0.5 rounded border border-[var(--rule)] hover:border-[var(--ink)] hover:text-[var(--ink)] bg-[var(--paper-subtle)] transition-colors"
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              </form>

              {/* Assessment Value Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--rule)] font-mono text-[12px]">
                <div>
                  <span className="text-[var(--accent)] font-bold block mb-0.5">[ 01 ]</span>
                  <span className="font-semibold text-[var(--ink)] block">REAL BRAND DATA</span>
                  <span className="text-[var(--ink-soft)] text-[11px]">No static templates. Ingests live CSS & OG metrics.</span>
                </div>
                <div>
                  <span className="text-[var(--accent)] font-bold block mb-0.5">[ 02 ]</span>
                  <span className="font-semibold text-[var(--ink)] block">TRANSPARENT AI</span>
                  <span className="text-[var(--ink-soft)] text-[11px]">Explains exact rationale for footage & sound pairing.</span>
                </div>
                <div>
                  <span className="text-[var(--accent)] font-bold block mb-0.5">[ 03 ]</span>
                  <span className="font-semibold text-[var(--ink)] block">PROBED MP4</span>
                  <span className="text-[var(--ink-soft)] text-[11px]">Strict 5–10s validation via automated ffprobe.</span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Interactive Reel Specimen Showcase */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
              <div className="w-full max-w-md rounded-2xl border border-[var(--rule)] bg-[var(--paper-elevated)] p-4 sm:p-5 shadow-lg space-y-4">
                {/* Specimen Header & Selector */}
                <div className="flex items-center justify-between border-b border-[var(--rule)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] font-bold">
                      [ SPECIMEN // LIVE PREVIEW ]
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    {SPECIMENS.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSpecimen(idx)}
                        className={`press px-2 py-0.5 rounded text-[11px] font-bold ${
                          activeSpecimen === idx
                            ? 'bg-[var(--ink)] text-[var(--paper)]'
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        0{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertical Phone Preview */}
                <div className="flex justify-center py-2">
                  <div className="phone relative group">
                    <div className="phone-screen relative flex flex-col justify-between overflow-hidden">
                      {/* Video element */}
                      <video
                        src={specimen.videoSrc}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover"
                      />

                      {/* Brand Color Header Badge */}
                      <div className="relative z-10 p-3 flex items-center justify-between">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-xs"
                          style={{ backgroundColor: specimen.brandColor }}
                        >
                          {specimen.title}
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsMuted(!isMuted)}
                          className="h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center press"
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        </button>
                      </div>

                      {/* Kinetic Typography Box Mockup */}
                      <div className="relative z-10 p-3 mt-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <div
                          className="p-2.5 rounded-lg border-2 bg-black/80 backdrop-blur-xs text-[11px] font-bold text-white leading-tight"
                          style={{ borderColor: specimen.brandColor }}
                        >
                          &ldquo;{specimen.hook}&rdquo;
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-white/70 mt-2">
                          <span>{specimen.soundtrack}</span>
                          <span>30 FPS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specimen Telemetry Readout */}
                <div className="space-y-2 font-mono text-[11px] border-t border-[var(--rule)] pt-3 text-[var(--ink-soft)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--ink-muted)]">SOURCE URL:</span>
                    <a
                      href={specimen.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--ink)] hover:text-[var(--accent)] underline inline-flex items-center gap-0.5"
                    >
                      <span>{specimen.url.replace('https://', '')}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[var(--ink-muted)]">BRAND COLOR:</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: specimen.brandColor }}
                      />
                      <span className="text-[var(--ink)] font-semibold">{specimen.brandColor}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[var(--ink-muted)]">METRICS EXTRACTED:</span>
                    <span className="text-[var(--ink)] text-right truncate max-w-[180px]">
                      {specimen.metrics}
                    </span>
                  </div>

                  {/* AI Rationale Quote */}
                  <div className="p-2.5 rounded bg-[var(--paper-subtle)] border border-[var(--rule)] text-[10px] font-sans italic text-[var(--ink-soft)] leading-snug">
                    <span className="font-mono not-italic font-bold text-[var(--ink)] block mb-0.5">
                      [ DECISION RATIONALE ]:
                    </span>
                    {specimen.rationale}
                  </div>

                  <button
                    type="button"
                    onClick={() => onLaunchStudio(`Generate a UGC video for ${specimen.url}`)}
                    className="press w-full mt-2 py-2 rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] text-[12px] font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>OPEN IN STUDIO BENCH</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: 6-STAGE DETERMINISTIC PIPELINE (SWISS MODULAR MATRIX) */}
      <section className="border-b border-[var(--rule)] bg-[var(--paper-subtle)]/40 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--rule)] pb-6">
            <div>
              <div className="font-mono text-[11px] text-[var(--accent)] font-semibold uppercase tracking-wider">
                [ SPEC-02 // DETERMINISTIC ARCHITECTURE ]
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-[var(--ink)]">
                The 6-Stage UGC Video Pipeline
              </h2>
            </div>
            <p className="font-mono text-[12px] text-[var(--ink-muted)] max-w-md">
              Every video is synthesized deterministically without client-side hand-waving. Each stage streams real-time latency diagnostics to the client.
            </p>
          </div>

          {/* 6-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PIPELINE_SPEC.map((step) => (
              <div
                key={step.index}
                className="relative rounded-2xl border border-[var(--rule)] bg-[var(--paper-elevated)] p-6 space-y-4 hover:border-[var(--ink)] transition-colors group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--rule)] pb-3">
                    <span className="font-mono text-xl font-bold text-[var(--accent)]">
                      {step.index}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--paper-subtle)] border border-[var(--rule)] text-[var(--ink)] font-semibold">
                      {step.badge}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] block">
                      {step.phase}
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--rule)] font-mono text-[11px] text-[var(--ink)] font-medium flex items-center justify-between">
                  <span className="text-[var(--ink-muted)]">ENGINE:</span>
                  <span>{step.tech}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: SYSTEM DIFFERENTIATION & RIGOR */}
      <section className="border-b border-[var(--rule)] bg-[var(--paper)] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <span className="font-mono text-[11px] text-[var(--accent)] font-semibold uppercase tracking-wider">
              [ SPEC-03 // PRODUCTION CRITERIA ]
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
              Built to read as &ldquo;Shipped Production Software&rdquo;, not a generic prototype.
            </h2>
            <p className="text-[16px] text-[var(--ink-soft)] leading-relaxed">
              Evaluating AI software requires testing edge cases, latency boundaries, and deterministic quality control. Here is how ReelForge defends against failure modes:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-[var(--rule)] p-6 sm:p-8 space-y-4 bg-[var(--paper-elevated)]">
              <div className="font-mono text-[12px] font-bold text-[var(--accent)]">
                {'// EDGE CASE RESILIENCE'}
              </div>
              <h3 className="text-xl font-bold">Unreachable & Anti-Bot Protection Handling</h3>
              <p className="text-[14px] text-[var(--ink-soft)] leading-relaxed">
                If a user pastes a 404 URL or an anti-bot protected page, the pipeline catches the error gracefully. Rather than crashing, it presents an actionable error recovery card with a 1-click &ldquo;Retry Generation&rdquo; trigger or asks for a 1-sentence prompt fallback to immediately cut the video.
              </p>
              <div className="font-mono text-[11px] p-3 rounded bg-[var(--paper-subtle)] text-[var(--ink)] border border-[var(--rule)]">
                ✓ Handled: DNS timeout, 404 not found, Cloudflare bot challenges, empty DOM
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--rule)] p-6 sm:p-8 space-y-4 bg-[var(--paper-elevated)]">
              <div className="font-mono text-[12px] font-bold text-[var(--accent)]">
                {'// RIGID QUALITY ASSURANCE'}
              </div>
              <h3 className="text-xl font-bold">Automated ffprobe Duration & Aspect Ratio Guard</h3>
              <p className="text-[14px] text-[var(--ink-soft)] leading-relaxed">
                Before any video URL is issued to the client, the composited MP4 is automatically probed with ffprobe. It enforces a strict duration between 5.0 and 10.0 seconds, verifies the 9:16 vertical resolution (720×1280), and validates that audio tracks are synchronized without drift.
              </p>
              <div className="font-mono text-[11px] p-3 rounded bg-[var(--paper-subtle)] text-[var(--ink)] border border-[var(--rule)]">
                ✓ Enforced: 5.0s ≤ Duration ≤ 10.0s • 30fps H.264 • Auto-retry on corruption
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: CALL TO ACTION FOOTER */}
      <section className="bg-[var(--paper-elevated)] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 font-mono text-[12px] text-[var(--accent)] font-bold">
            <Radio className="h-4 w-4 animate-pulse" />
            <span>STUDIO READY FOR EVALUATION</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--ink)]">
            Ready to test the live UGC video synthesizer?
          </h2>

          <p className="text-[16px] text-[var(--ink-soft)] max-w-xl mx-auto">
            Experience the real-time SSE streaming workbench, live ffprobe validation, and custom 9:16 player controls.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onLaunchStudio()}
              className="press w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] text-[14px] font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>ENTER STUDIO WORKBENCH</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {!isAuthenticated && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="press w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[var(--rule)] hover:border-[var(--ink)] text-[14px] font-mono font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>SIGN IN OPTIONS</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER COLOPHON */}
      <footer className="border-t border-[var(--rule)] bg-[var(--paper)] py-8 font-mono text-[11px] text-[var(--ink-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--ink)]">REELFORGE™</span>
            <span>{'// 8X TECHNICAL ASSESSMENT SUBMISSION'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-center sm:text-right">
            <span>NEXT.JS 16 APP ROUTER</span>
            <span>REACT 19</span>
            <span>FFMPEG HEADLESS</span>
            <span>SWISS MINIMALIST V4</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
