'use client';

import React from 'react';
import { Check, Loader2, AlertCircle, RefreshCw, Edit3 } from 'lucide-react';
import { PipelineStep, StepId } from '@/types/chat';

interface PipelineTrackerProps {
  steps: PipelineStep[];
  activeStepId?: StepId;
  detectedUrl?: string;
  error?: string;
  onRetry?: () => void;
  onEditUrl?: (url: string) => void;
}

const DEFAULT_STEPS: { id: StepId; index: string; label: string; defaultDesc: string }[] = [
  {
    id: 'reading_url',
    index: '01',
    label: 'Ingest Content & Brand Color',
    defaultDesc: 'Scraping page copy via Jina Reader + extracting OG metadata and CSS theme-color.',
  },
  {
    id: 'extracting_context',
    index: '02',
    label: 'Reasoning Angle & Metrics',
    defaultDesc: 'Identifying product category, user pain points, and quantified social proof.',
  },
  {
    id: 'generating_blueprint',
    index: '03',
    label: 'Synthesizing Kinetic Hook',
    defaultDesc: 'Composing high-converting 1-sentence headline for 9:16 vertical attention.',
  },
  {
    id: 'matching_media',
    index: '04',
    label: 'Curating Video, Beat & Meme',
    defaultDesc: 'Pairing category vertical footage, mood-matched audio track, and reaction GIF.',
  },
  {
    id: 'compositing_video',
    index: '05',
    label: 'Headless FFmpeg Rendering',
    defaultDesc: 'Compositing 1080x1920 MP4 at 30fps with brand-color highlighted typography boxes.',
  },
  {
    id: 'validating_video',
    index: '06',
    label: 'ffprobe Telemetry Verification',
    defaultDesc: 'Checking duration strictly 5–10s, 9:16 aspect ratio, and audio sync.',
  },
];

export default function PipelineTracker({
  steps = [],
  activeStepId,
  detectedUrl,
  error,
  onRetry,
  onEditUrl,
}: PipelineTrackerProps) {
  const stepsMap = new Map<StepId, PipelineStep>();
  steps.forEach((s) => stepsMap.set(s.id, s));

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const isFinished = completedCount >= DEFAULT_STEPS.length;
  const hasError = !!error || steps.some((s) => s.status === 'error');
  const progressPercent = Math.min(100, Math.round((completedCount / DEFAULT_STEPS.length) * 100));

  return (
    <div className="rounded-xl border border-[var(--rule)] bg-[var(--paper-elevated)] p-3.5 space-y-3 font-mono text-[12px]">
      {/* Tracker Status Line & Progress Bar */}
      <div className="space-y-1.5 border-b border-[var(--rule)] pb-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)] font-bold">[ PIPELINE ]</span>
            <span className="font-semibold text-[var(--ink)]">
              {hasError
                ? 'HALTED'
                : isFinished
                ? 'COMPLETE (6/6)'
                : `PROCESSING (${Math.min(completedCount + 1, 6)}/6)`}
            </span>
          </div>
          <span className="text-[var(--ink-muted)] tabular-nums">{progressPercent}%</span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="h-1 w-full bg-[var(--paper-subtle)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 6 Step Rows */}
      <div className="space-y-2 pt-0.5">
        {DEFAULT_STEPS.map((defStep) => {
          const stepData = stepsMap.get(defStep.id);
          const isActive = stepData?.status === 'active' || activeStepId === defStep.id;
          const isCompleted = stepData?.status === 'completed';
          const isFailed = stepData?.status === 'error' || (hasError && isActive);

          return (
            <div
              key={defStep.id}
              className={`flex items-start gap-2.5 py-1 px-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--ink)] font-medium'
                  : isCompleted
                  ? 'text-[var(--ink)]'
                  : isFailed
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--ink-muted)] opacity-50'
              }`}
            >
              {/* Step Index & State Icon */}
              <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
                <span className="text-[10px] text-[var(--ink-muted)]">{defStep.index}</span>
                <span className="grid h-3.5 w-3.5 place-items-center">
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : isActive ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                  ) : isFailed ? (
                    <AlertCircle className="h-3.5 w-3.5 text-[var(--accent)]" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--rule)]" />
                  )}
                </span>
              </div>

              {/* Step Label & Latency */}
              <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                <div className="truncate">
                  <span className="truncate block font-semibold">{defStep.label}</span>
                  {isActive && stepData?.description && (
                    <p className="text-[10px] text-[var(--ink-soft)] font-sans mt-0.5 leading-snug">
                      {stepData.description}
                    </p>
                  )}
                </div>

                {stepData?.completedAt && stepData?.startedAt && (
                  <span className="text-[10px] text-[var(--ink-muted)] tabular-nums shrink-0">
                    +{((stepData.completedAt - stepData.startedAt) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error state & recovery */}
      {hasError && (
        <div className="border-t border-[var(--rule)] pt-2.5 space-y-2">
          <p className="text-[var(--accent)] text-[11px] leading-snug">
            {error || 'Pipeline execution was interrupted.'}
          </p>

          <div className="flex items-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="press px-2.5 py-1 rounded bg-[var(--accent)] text-white text-[11px] font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                <span>RETRY PIPELINE</span>
              </button>
            )}

            {detectedUrl && onEditUrl && (
              <button
                type="button"
                onClick={() => onEditUrl(detectedUrl)}
                className="press px-2.5 py-1 rounded border border-[var(--rule)] bg-[var(--paper-subtle)] text-[var(--ink)] text-[11px] flex items-center gap-1.5"
              >
                <Edit3 className="h-3 w-3" />
                <span>EDIT URL</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
