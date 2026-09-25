'use client';

import React from 'react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import {
  Film,
  Plus,
  LogOut,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'studio';
  onTabChange: (tab: 'overview' | 'studio') => void;
  onOpenArchive: () => void;
  onResetSession: () => void;
  onOpenAuthModal: () => void;
  savedCount?: number;
  isGenerating?: boolean;
}

export default function Navbar({
  activeTab,
  onTabChange,
  onOpenArchive,
  onResetSession,
  onOpenAuthModal,
  savedCount = 0,
  isGenerating = false,
}: NavbarProps) {
  const { data: session, status } = useSession();

  return (
    <header className="flex-none h-14 border-b border-[var(--rule)] bg-[var(--paper)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 transition-colors">
      {/* Brand & System Status */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className="press flex items-center gap-2 group text-left"
        >
          <div className="h-6 w-6 rounded bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-bold text-[12px] tracking-tight group-hover:bg-[var(--accent)] transition-colors">
            R
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] tracking-tight leading-none text-[var(--ink)]">
              REELFORGE<span className="text-[var(--accent)]">.</span>
            </span>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[var(--rule)] font-mono text-[11px] text-[var(--ink-muted)]">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isGenerating ? 'bg-[var(--accent)]' : 'bg-emerald-400'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isGenerating ? 'bg-[var(--accent)]' : 'bg-emerald-500'}`} />
          </span>
          <span className="tracking-wider uppercase">
            {isGenerating ? 'COMPOSITING 9:16' : '30FPS READY'}
          </span>
        </div>
      </div>

      {/* Center Navigation Mode Switcher */}
      <nav className="flex items-center rounded-lg border border-[var(--rule)] p-0.5 bg-[var(--paper-subtle)]/60 text-[12px] font-mono">
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className={`press px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-[var(--paper-elevated)] text-[var(--ink)] font-semibold shadow-xs'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <span className="opacity-40">01</span>
          <span>OVERVIEW</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('studio')}
          className={`press px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'studio'
              ? 'bg-[var(--paper-elevated)] text-[var(--ink)] font-semibold shadow-xs'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <span className="opacity-40">02</span>
          <span>STUDIO</span>
          {isGenerating && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          )}
        </button>
      </nav>

      {/* Right Actions & Account */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Archive Button */}
        <button
          type="button"
          onClick={onOpenArchive}
          className="press px-2.5 py-1.5 rounded-lg border border-[var(--rule)] hover:border-[var(--ink)] text-[12px] font-mono flex items-center gap-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
          title="Open saved reels drawer"
        >
          <Film className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
          <span className="hidden sm:inline">ARCHIVE</span>
          {savedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-[var(--ink)] text-[var(--paper)] text-[10px] font-bold">
              {savedCount}
            </span>
          )}
        </button>

        {/* Reset Session Button (when in Studio) */}
        {activeTab === 'studio' && (
          <button
            type="button"
            onClick={onResetSession}
            className="press hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--rule)] hover:border-[var(--ink)] text-[12px] font-mono text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
            title="Start fresh conversation"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>NEW</span>
          </button>
        )}

        {/* Auth / Profile Area */}
        <div className="pl-1 sm:pl-2 border-l border-[var(--rule)] flex items-center gap-2">
          {status === 'authenticated' && session?.user ? (
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={28}
                  height={28}
                  unoptimized
                  className="h-7 w-7 rounded-full object-cover border border-[var(--rule)]"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center text-[11px] font-mono font-bold">
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}

              <span className="hidden md:inline font-mono text-[11px] text-[var(--ink-soft)] truncate max-w-[120px]">
                {session.user.name || session.user.email}
              </span>

              <button
                type="button"
                onClick={() => signOut()}
                className="press p-1.5 rounded-md text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="press px-3 py-1.5 rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] text-[12px] font-mono font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>ACCESS</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
