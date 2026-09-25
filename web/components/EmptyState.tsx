'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const FEATURED_PROMPTS = [
  {
    title: 'Cal AI',
    url: 'calai.app',
    prompt: 'Generate a UGC video for calai.app',
    category: 'Fitness',
    description: 'Food tracking via camera for instant nutrition breakdowns.',
  },
  {
    title: 'Linear',
    url: 'linear.app',
    prompt: 'Create marketing reel for linear.app',
    category: 'Developer',
    description: 'Issue tracking built for modern engineering teams.',
  },
  {
    title: 'Olipop',
    url: 'drinkolipop.com',
    prompt: 'Make a UGC video for drinkolipop.com',
    category: 'Beverage',
    description: 'Prebiotic modern soda with plant fiber and botanicals.',
  },
  {
    title: 'Raycast',
    url: 'raycast.com',
    prompt: 'Generate a UGC reel for raycast.com',
    category: 'Productivity',
    description: 'Extendable desktop launcher for power users.',
  },
];

export default function EmptyState({ onSelectPrompt, disabled }: EmptyStateProps) {
  return (
    <div className="py-6 sm:py-8 space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-[17px] font-semibold tracking-tight text-[var(--ink)]">
          Paste a link. We cut the reel.
        </h2>
        <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
          Drop any product or startup URL below. We scrape the copy, pick footage and sound, and assemble a 9:16 vertical video.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[12px] font-medium tracking-wide uppercase text-[var(--ink-soft)]">
          Sample products
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {FEATURED_PROMPTS.map((item) => (
            <button
              key={item.url}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              disabled={disabled}
              className="press group text-left rounded-xl border border-[var(--rule)] p-3.5 hover:border-[var(--ink)] transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-medium text-[var(--ink)] group-hover:underline underline-offset-2">
                  {item.title}
                </span>
                <span className="text-[11px] text-[var(--ink-soft)] flex items-center gap-0.5">
                  {item.category}
                  <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-snug text-[var(--ink-soft)]">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
