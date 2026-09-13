'use client';

import React from 'react';
import {
  Film,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const FEATURED_PROMPTS = [
  {
    title: 'Cal AI',
    category: 'DTC Health & Fitness',
    url: 'calai.app',
    prompt: 'Generate a UGC video for calai.app',
    badge: 'Trending Hook',
    description: 'Photo-based food tracking app for instant nutrition breakdowns.',
  },
  {
    title: 'Linear',
    category: 'Developer & SaaS',
    url: 'linear.app',
    prompt: 'Create marketing reel for linear.app',
    badge: 'High Conversion',
    description: 'High-speed issue tracking built for modern engineering teams.',
  },
  {
    title: 'Olipop',
    category: 'E-Commerce & Beverage',
    url: 'drinkolipop.com',
    prompt: 'Make a UGC video for drinkolipop.com',
    badge: 'Viral Meme',
    description: 'Prebiotic modern soda with plant fiber and botanicals.',
  },
  {
    title: 'Raycast',
    category: 'Productivity & Mac',
    url: 'raycast.com',
    prompt: 'Generate a UGC reel for raycast.com',
    badge: 'Popular',
    description: 'Blazingly fast, extendable launcher for Mac power users.',
  },
];

export default function EmptyState({ onSelectPrompt, disabled }: EmptyStateProps) {
  return (
    <div className="py-8 sm:py-12 max-w-2xl mx-auto w-full space-y-8 animate-message-enter">
      {/* Brand Hero Card */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FF6B00]/5 border border-[#FF6B00]/30 shadow-lg shadow-[#FF6B00]/10 mb-1">
          <Film className="w-8 h-8 text-[#FF8533]" />
        </div>

        <div className="flex items-center justify-center gap-2">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            REELFORGE STUDIO
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#FF6B00]/15 text-[#FF8533] border border-[#FF6B00]/30 rounded-full">
            v2.0
          </span>
        </div>

        <p className="text-sm text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
          Drop any product or startup URL into the chat. We scrape the positioning, write a
          punchy kinetic hook, and composite a ready-to-share 9:16 UGC video.
        </p>
      </div>

      {/* 3-Step Live Pipeline Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#13161C] border border-[#232834] text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-[#1C212B] text-[#FF8533] border border-[#2D3444] flex items-center justify-center text-[10px] font-mono">
              1
            </span>
            <span>Link Ingestion</span>
          </div>
          <p className="text-[11px] text-[#788090] mt-1.5 leading-relaxed">
            Extracts product benefits, headlines & features via Jina Reader.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#13161C] border border-[#232834] text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-[#1C212B] text-[#FF8533] border border-[#2D3444] flex items-center justify-center text-[10px] font-mono">
              2
            </span>
            <span>UGC Storyboard</span>
          </div>
          <p className="text-[11px] text-[#788090] mt-1.5 leading-relaxed">
            Synthesizes viral kinetic hooks and finds reaction GIF memes.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#13161C] border border-[#232834] text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-[#1C212B] text-[#FF8533] border border-[#2D3444] flex items-center justify-center text-[10px] font-mono">
              3
            </span>
            <span>FFmpeg Compositor</span>
          </div>
          <p className="text-[11px] text-[#788090] mt-1.5 leading-relaxed">
            Mixes 1080x1920 vertical reel with trending soundtrack.
          </p>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A909E] font-mono flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#FF6B00]" /> Click to Test a Product URL
          </span>
          <span className="text-[11px] text-[#555D6E]">Instant 1-Click Launch</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURED_PROMPTS.map((item) => (
            <button
              key={item.url}
              onClick={() => onSelectPrompt(item.prompt)}
              disabled={disabled}
              className="p-3.5 rounded-xl bg-[#13161C] hover:bg-[#181C25] border border-[#232834] hover:border-[#FF6B00]/40 text-left transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-[#FF8533] transition-colors flex items-center gap-1.5">
                  {item.title}
                  <span className="font-mono text-[10px] text-[#6B7280] font-normal">
                    ({item.url})
                  </span>
                </span>
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#1C202A] text-[#FF8533] border border-[#2C3342]">
                  {item.badge}
                </span>
              </div>

              <p className="text-[11px] text-[#8A909E] leading-relaxed mb-2">
                {item.description}
              </p>

              <div className="flex items-center text-[11px] font-medium text-[#FF8533] group-hover:translate-x-0.5 transition-transform gap-1">
                <span>Generate video</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
