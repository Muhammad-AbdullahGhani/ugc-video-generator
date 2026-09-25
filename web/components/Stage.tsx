'use client';

import React from 'react';
import { ChatMessage } from '@/types/chat';
import { isCutting, prettyAsset, hostLabel } from '@/lib/desk-copy';
import VideoPlayer from '@/components/VideoPlayer';
import {
  Film,
  Music,
  Smile,
  Type,
  ExternalLink,
  RefreshCw,
  Edit3,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface StageProps {
  message: ChatMessage | null;
  onRetry?: () => void;
  onEditUrl?: (url: string) => void;
}

/** Tracks the cursor over an element so `.spotlight` can glow toward it. */
function trackSpotlight(e: React.MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
}

function EmptyPhone({ working }: { working: boolean }) {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone-screen flex flex-col justify-between p-5 bg-[var(--paper-subtle)] text-[var(--ink)]">
        <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)]">
          <span>9:16</span>
          <span>1080×1920</span>
        </div>

        <div className="text-center space-y-2 py-8">
          {working ? (
            <div className="space-y-3">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <p className="font-mono text-[12px] font-bold text-[var(--ink)]">
                COMPOSITING REEL...
              </p>
              <p className="font-mono text-[10px] text-[var(--ink-muted)]">
                Rendering 30fps vertical MP4
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto h-8 w-8 rounded-full bg-[var(--paper)] border border-[var(--rule)] grid place-items-center text-[var(--ink-muted)]">
                <Film className="h-4 w-4" />
              </div>
              <p className="font-mono text-[12px] font-bold text-[var(--ink)]">
                STAGE IDLE
              </p>
              <p className="font-mono text-[10px] text-[var(--ink-muted)] leading-tight">
                Submit a product link on the right to cut a reel.
              </p>
            </div>
          )}
        </div>

        <div className="font-mono text-[10px] text-[var(--ink-muted)] flex items-center justify-between border-t border-[var(--rule)] pt-2">
          <span>TARGET: 5–10S</span>
          <span>FFMPEG</span>
        </div>
      </div>
    </div>
  );
}

export default function Stage({ message, onRetry, onEditUrl }: StageProps) {
  const blueprint = message?.blueprint;
  const working = isCutting(message);
  const brandColor = blueprint?.brand_color || '#E53525';
  const host = hostLabel(message?.detectedUrl);

  return (
    <div className="h-full w-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto overscroll-contain">
      {/* Stage Status Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] border-b border-[var(--rule)] pb-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)] font-bold">[ STAGE // 01 ]</span>
          <span className="text-[var(--ink-muted)]">TELEMETRY INSPECTOR</span>
        </div>

        <div className="flex items-center gap-3">
          {working && (
            <div className="flex items-center gap-1.5 text-[var(--accent)] font-bold">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-ping" />
              <span>LIVE COMPOSITOR</span>
            </div>
          )}
          {message?.detectedUrl && (
            <a
              href={message.detectedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ink-soft)] hover:text-[var(--ink)] underline inline-flex items-center gap-1"
            >
              <span>{host || message.detectedUrl}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Main Studio Split Layout */}
      <div className="flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-8 lg:gap-12 max-w-6xl mx-auto w-full my-auto">
        {/* Left: 9:16 Video Player or Placeholder */}
        <div
          key={message?.videoUrl || (working ? 'rendering' : 'idle')}
          className="cross-fade shrink-0 flex flex-col items-center"
        >
          {message?.videoUrl ? (
            <VideoPlayer
              key={message.videoUrl}
              videoUrl={message.videoUrl}
              detectedUrl={message.detectedUrl}
              blueprint={blueprint}
              autoPlay={true}
            />
          ) : (
            <EmptyPhone working={working} />
          )}
        </div>

        {/* Right: Technical Telemetry & Layer Inspector */}
        <div
          key={`${message?.detectedUrl || 'none'}-${message?.videoUrl ? 'ready' : 'pending'}`}
          className="cross-fade w-full max-w-xl space-y-4"
        >
          {/* Header Card: Brand and Category */}
          <div
            onMouseMove={trackSpotlight}
            className="spotlight tactile rounded-xl border border-[var(--rule)] bg-[var(--paper-elevated)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 font-mono text-[11px]">
              <span className="text-[var(--ink-muted)] uppercase">INGESTED BRAND DATA</span>
              <span className="px-2 py-0.5 rounded bg-[var(--paper-subtle)] text-[var(--ink)] font-bold uppercase">
                {blueprint?.category || 'STANDBY'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
              <div className="tactile-sm flex items-center gap-2 rounded-md px-1 -mx-1">
                <span
                  className="h-4 w-4 rounded-md border border-black/20 shrink-0"
                  style={{ backgroundColor: brandColor }}
                />
                <div>
                  <span className="text-[10px] text-[var(--ink-muted)] block">ACCENT HEX</span>
                  <span className="text-[var(--ink)] font-semibold">{brandColor}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[var(--ink-muted)] block">OG TITLE</span>
                <span className="text-[var(--ink)] truncate block">
                  {blueprint?.og_title || host || 'Awaiting input'}
                </span>
              </div>
            </div>
          </div>

          {/* Kinetic Hook Typography Card */}
          <div
            onMouseMove={trackSpotlight}
            className="spotlight tactile rounded-xl border border-[var(--rule)] bg-[var(--paper-elevated)] p-4 space-y-2"
          >
            <div className="flex items-center justify-between font-mono text-[11px] text-[var(--ink-muted)]">
              <div className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-[var(--ink)]" />
                <span>KINETIC HOOK COPY</span>
              </div>
              <span>
                {blueprint?.hook_text ? `${blueprint.hook_text.length} CHARS` : '0 CHARS'}
              </span>
            </div>

            <p className="text-[14px] leading-relaxed font-medium text-[var(--ink)]">
              {blueprint?.hook_text ? (
                <span>&ldquo;{blueprint.hook_text}&rdquo;</span>
              ) : (
                <span className="text-[var(--ink-muted)] italic">
                  Hook copy will be generated dynamically based on product value propositions.
                </span>
              )}
            </p>
          </div>

          {/* Asset Pairing Matrix */}
          <div
            onMouseMove={trackSpotlight}
            className="spotlight tactile rounded-xl border border-[var(--rule)] bg-[var(--paper-elevated)] p-4 space-y-2 font-mono text-[11px]"
          >
            <span className="text-[var(--ink-muted)] block border-b border-[var(--rule)] pb-1.5">
              PAIRED ASSET LAYERS
            </span>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--ink-soft)]">
                  <Film className="h-3.5 w-3.5 text-[var(--ink)]" />
                  <span>FOOTAGE:</span>
                </div>
                <span className="text-[var(--ink)] font-medium">
                  {prettyAsset(blueprint?.background_video) || 'Awaiting match'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--ink-soft)]">
                  <Music className="h-3.5 w-3.5 text-[var(--ink)]" />
                  <span>SOUNDTRACK:</span>
                </div>
                <span className="text-[var(--ink)] font-medium">
                  {prettyAsset(blueprint?.audio_track) || 'Awaiting match'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--ink-soft)]">
                  <Smile className="h-3.5 w-3.5 text-[var(--ink)]" />
                  <span>MEME REACTION:</span>
                </div>
                <span className="text-[var(--ink)] font-medium">
                  {prettyAsset(blueprint?.gif_search_term) || 'Awaiting match'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Decision Rationale Box */}
          {blueprint?.rationale && (
            <div className="rounded-xl border border-[var(--rule)] bg-[var(--paper-subtle)] p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink)] font-bold">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>DECISION RATIONALE:</span>
              </div>
              <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed italic">
                {blueprint.rationale}
              </p>
            </div>
          )}

          {/* Error Recovery Card */}
          {message?.error && !message.videoUrl && (
            <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 space-y-3 font-mono text-[12px]">
              <div className="flex items-center gap-2 text-[var(--accent)] font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>GENERATION HALTED</span>
              </div>
              <p className="text-[var(--ink)] font-sans text-[13px] leading-snug">
                {message.error}
              </p>
              <div className="flex items-center gap-3 pt-1">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="press tactile-sm px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>RETRY</span>
                  </button>
                )}
                {message.detectedUrl && onEditUrl && (
                  <button
                    type="button"
                    onClick={() => onEditUrl(message.detectedUrl || '')}
                    className="press tactile-sm px-3 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--paper-elevated)] text-[var(--ink)] flex items-center gap-1.5"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>CHANGE LINK</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}