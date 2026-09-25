'use client';

import React from 'react';
import { ArrowUpRight, Terminal } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const SPECIMEN_PROMPTS = [
  {
    title: 'Linear',
    url: 'linear.app',
    prompt: 'Generate a UGC video for linear.app',
    category: 'DEV // SAAS',
    description: 'Purpose-built issue tracking and planning for high-velocity software teams.',
  },
  {
    title: 'Cal AI',
    url: 'calai.app',
    prompt: 'Create marketing reel for calai.app',
    category: 'FITNESS // VISION',
    description: 'Instant nutrition & calorie breakdown directly from photo camera scans.',
  },
  {
    title: 'Olipop',
    url: 'drinkolipop.com',
    prompt: 'Make a UGC video for drinkolipop.com',
    category: 'DTC // BEVERAGE',
    description: 'Prebiotic modern soda with plant fiber, prebiotics, and botanicals.',
  },
  {
    title: 'Raycast',
    url: 'raycast.com',
    prompt: 'Generate a UGC reel for raycast.com',
    category: 'DESKTOP // OS',
    description: 'Blazing fast, extendable Mac launcher replacing Spotlight for developers.',
  },
];

export default function EmptyState({ onSelectPrompt, disabled }: EmptyStateProps) {
  return (
    <div className="py-6 space-y-6">
      {/* Intro Header */}
      <div className="space-y-2 border-b border-[var(--rule)] pb-4">
        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--accent)] font-semibold">
          <Terminal className="h-3.5 w-3.5" />
          <span>[ BENCHMARK PROTOCOL // READY ]</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
          Paste a product link to begin.
        </h2>
        <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
          Drop any startup or product URL below. The engine will scrape the live page, extract brand styling, and composite a 9:16 vertical MP4 in under 10 seconds.
        </p>
      </div>

      {/* Quick Specimen Triggers */}
      <div className="space-y-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] block">
          SELECT A SPECIMEN PRODUCT:
        </span>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SPECIMEN_PROMPTS.map((item) => (
            <button
              key={item.url}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              disabled={disabled}
              className="press group text-left rounded-xl border border-[var(--rule)] p-3.5 bg-[var(--paper-elevated)] hover:border-[var(--ink)] transition-colors disabled:opacity-50 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2 border-b border-[var(--rule)] pb-2 mb-2">
                <span className="font-mono text-[13px] font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                  {item.title}
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-muted)] flex items-center gap-0.5">
                  {item.category}
                  <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </div>
              <p className="text-[12px] leading-snug text-[var(--ink-soft)]">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
