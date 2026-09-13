'use client';

import React from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit3,
} from 'lucide-react';
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
    label: 'Reading Website Content',
    defaultDesc: 'Scraping website Markdown and copy via Jina AI...',
  },
  {
    id: 'extracting_context',
    label: 'Extracting Product Context',
    defaultDesc: 'Analyzing product positioning and key value propositions...',
  },
  {
    id: 'generating_blueprint',
    label: 'Generating UGC Blueprint',
    defaultDesc: 'Engineering viral typography hook & reaction search terms...',
  },
  {
    id: 'matching_media',
    label: 'Matching Reel & Soundtrack',
    defaultDesc: 'Selecting background vertical clip & trending audio track...',
  },
  {
    id: 'compositing_video',
    label: 'Compositing 9:16 Video',
    defaultDesc: 'Compositing 1080x1920 MP4 with kinetic typography & audio mix...',
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
  // Map step data by ID
  const stepsMap = new Map<StepId, PipelineStep>();
  steps.forEach((s) => stepsMap.set(s.id, s));

  // Determine completed step count
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const isFinished = completedCount === DEFAULT_STEPS.length;
  const hasError = !!error || steps.some((s) => s.status === 'error');

  return (
    <div className="w-full rounded-2xl bg-[#12141A] border border-[#252A34] overflow-hidden shadow-lg transition-all animate-message-enter">
      {/* Tracker Header */}
      <div className="px-4 py-3 bg-[#161921] border-b border-[#252A34] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasError ? (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          ) : isFinished ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-pulse" />
          )}
          <span className="font-display font-semibold text-xs text-white uppercase tracking-wider">
            Video Assembly Pipeline
          </span>
        </div>

        <span className="text-[11px] font-mono text-[#8A909E] bg-[#1B1F2A] px-2.5 py-0.5 rounded-full border border-[#2A3140]">
          {hasError
            ? 'Pipeline Interrupted'
            : isFinished
            ? '5/5 Completed'
            : `Step ${Math.min(completedCount + 1, 5)} of 5`}
        </span>
      </div>

      {/* Steps List */}
      <div className="p-4 space-y-3.5">
        {DEFAULT_STEPS.map((defStep, idx) => {
          const stepData = stepsMap.get(defStep.id);
          const isActive = stepData?.status === 'active' || activeStepId === defStep.id;
          const isCompleted = stepData?.status === 'completed';
          const isFailed = stepData?.status === 'error' || (hasError && isActive);

          return (
            <div
              key={defStep.id}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#181C25] border border-[#FF6B00]/40 shadow-sm'
                  : isCompleted
                  ? 'bg-[#12151B]/60'
                  : isFailed
                  ? 'bg-red-950/20 border border-red-800/40'
                  : 'opacity-50'
              }`}
            >
              {/* Step Status Indicator Icon */}
              <div className="flex-none mt-0.5">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-[#FF6B00]/20 text-[#FF8533] border border-[#FF6B00]/40 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#FF8533]" />
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-md shadow-[#FF6B00]/30 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                ) : isFailed ? (
                  <div className="w-6 h-6 rounded-full bg-red-950 text-red-400 border border-red-800/60 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1A1D26] border border-[#2B313F] text-[#555D6E] flex items-center justify-center text-[10px] font-mono">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Step Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-xs font-semibold truncate ${
                      isActive
                        ? 'text-white'
                        : isCompleted
                        ? 'text-[#E5E7EB]'
                        : isFailed
                        ? 'text-red-300'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {stepData?.label || defStep.label}
                  </h4>

                  {stepData?.completedAt && stepData?.startedAt && (
                    <span className="text-[10px] font-mono text-[#717888] flex-none">
                      {((stepData.completedAt - stepData.startedAt) / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                <p
                  className={`text-[11px] mt-0.5 leading-normal ${
                    isActive
                      ? 'text-[#FF8533]'
                      : isCompleted
                      ? 'text-[#8A909E]'
                      : isFailed
                      ? 'text-red-400'
                      : 'text-[#555D6E]'
                  }`}
                >
                  {stepData?.description || defStep.defaultDesc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Callout with Clear Retry Action */}
      {hasError && (
        <div className="p-4 bg-red-950/30 border-t border-red-900/40 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-none mt-0.5" />
            <div>
              <span className="font-semibold block text-red-200">Video Generation Interrupted</span>
              <p className="text-[11px] text-red-300/90 mt-0.5">
                {error || 'An unexpected error prevented this step from finishing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-semibold transition cursor-pointer shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Generation</span>
              </button>
            )}

            {detectedUrl && onEditUrl && (
              <button
                onClick={() => onEditUrl(detectedUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D222C] hover:bg-[#272D3A] text-xs text-[#D1D5DB] border border-[#2D3442] transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Edit Link</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
