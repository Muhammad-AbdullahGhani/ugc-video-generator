'use client';

import React from 'react';
import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { PipelineStep, StepId } from '@/types/chat';

interface PipelineTrackerProps {
  steps: PipelineStep[];
  activeStepId?: StepId;
  detectedUrl?: string;
  error?: string;
  onRetry?: () => void;
  onEditUrl?: (url: string) => void;
}

const DEFAULT_STEPS: { id: StepId; label: string; defaultDesc: string }[] = [
  {
    id: 'reading_url',
    label: 'Reading the page',
    defaultDesc: 'Scraping page copy, open graph metadata, and social proof.',
  },
  {
    id: 'extracting_context',
    label: 'Working out what it is',
    defaultDesc: 'Identifying product category, pain points, and audience hook.',
  },
  {
    id: 'generating_blueprint',
    label: 'Writing the line',
    defaultDesc: 'Composing kinetic typography headline and social proof overlay.',
  },
  {
    id: 'matching_media',
    label: 'Picking picture, sound, and gif',
    defaultDesc: 'Selecting industry vertical background, soundtrack, and reaction sticker.',
  },
  {
    id: 'compositing_video',
    label: 'Assembling the reel',
    defaultDesc: 'Rendering 9:16 vertical video with typography and mixed audio.',
  },
  {
    id: 'validating_video',
    label: 'Checking the length',
    defaultDesc: 'Probing duration (5–10s), 9:16 resolution, and audio track via ffprobe.',
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

  return (
    <div className="rounded-xl border border-[var(--rule)] p-3 text-[13px] space-y-2.5">
      <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 text-[12px] text-[var(--ink-soft)]">
        <span>
          {hasError
            ? 'Stopped'
            : isFinished
            ? 'Ready'
            : `Cutting reel (${Math.min(completedCount + 1, 6)}/6)`}
        </span>
        {detectedUrl && <span className="truncate max-w-[200px]">{detectedUrl}</span>}
      </div>

      <div className="space-y-1.5 pt-0.5">
        {DEFAULT_STEPS.map((defStep) => {
          const stepData = stepsMap.get(defStep.id);
          const isActive = stepData?.status === 'active' || activeStepId === defStep.id;
          const isCompleted = stepData?.status === 'completed';
          const isFailed = stepData?.status === 'error' || (hasError && isActive);

          return (
            <div
              key={defStep.id}
              className={`flex items-start gap-2.5 py-0.5 ${
                isActive
                  ? 'text-[var(--ink)] font-medium'
                  : isCompleted
                  ? 'text-[var(--ink)]'
                  : isFailed
                  ? 'text-[var(--mark)]'
                  : 'text-[var(--ink-soft)] opacity-60'
              }`}
            >
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-[var(--ink)]" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--mark)]" />
                ) : isFailed ? (
                  <AlertCircle className="h-3.5 w-3.5 text-[var(--mark)]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--rule)]" />
                )}
              </span>

              <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                <span className="truncate">{defStep.label}</span>
                {stepData?.completedAt && stepData?.startedAt && (
                  <span className="text-[11px] text-[var(--ink-soft)] tabular-nums shrink-0">
                    {((stepData.completedAt - stepData.startedAt) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasError && (
        <div className="border-t border-[var(--rule)] pt-2 text-[12px] space-y-1.5">
          <p className="text-[var(--mark)]">{error || 'Generation interrupted.'}</p>
          <div className="flex gap-4">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="press flex items-center gap-1 underline underline-offset-4"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Try again</span>
              </button>
            )}
            {detectedUrl && onEditUrl && (
              <button
                type="button"
                onClick={() => onEditUrl(detectedUrl)}
                className="press text-[var(--ink-soft)] underline decoration-[var(--rule)] underline-offset-4"
              >
                Change link
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
