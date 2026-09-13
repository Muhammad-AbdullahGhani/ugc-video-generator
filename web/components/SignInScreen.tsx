'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Film,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  Play,
} from 'lucide-react';

export default function SignInScreen() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      await signIn('google');
    } catch (err) {
      console.error('Google sign in error:', err);
      setLoadingGoogle(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setLoadingGuest(true);
      await signIn('demo-guest', {
        name: 'Creator Guest',
        email: 'guest@reelforge.ai',
        callbackUrl: '/',
      });
    } catch (err) {
      console.error('Guest sign in error:', err);
      setLoadingGuest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F3F4F6] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#FF6B00]/12 via-[#FF6B00]/4 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-[500px] h-[500px] bg-[#FF6B00]/5 blur-[120px] pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#E05300] flex items-center justify-center shadow-lg shadow-[#FF6B00]/20 text-white">
            <Film className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-white tracking-tight">
                REELFORGE
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#FF6B00]/15 text-[#FF8533] border border-[#FF6B00]/30 rounded-full">
                UGC Studio
              </span>
            </div>
            <p className="text-xs text-[#8A909E]">AI Viral Video Assembler</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8A909E] font-mono">
          <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
          <span>v2.0 • 9:16 Engine Ready</span>
        </div>
      </header>

      {/* Main Hero & Authentication Box */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 py-8 md:py-12 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
        {/* Left column: Value Proposition & Visual Pipeline */}
        <div className="flex-1 text-center lg:text-left space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161920] border border-[#252A34] text-xs text-[#D1D5DB] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span className="font-medium">Instant Product-to-Video Pipeline</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Turn Any Product URL Into a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8533] via-[#FF6B00] to-[#FF5500]">
              High-Converting UGC Video
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed">
            Paste any startup or DTC link. ReelForge autonomously scrapes marketing copy,
            engineers kinetic hooks, selects dynamic vertical background clips, and mixes
            beat-synced trending audio into a ready-to-publish 9:16 vertical video.
          </p>

          {/* 3 Step highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#111317] border border-[#252A34] text-left hover:border-[#FF6B00]/40 transition-colors group">
              <div className="w-7 h-7 rounded-lg bg-[#1D222B] flex items-center justify-center text-[#FF8533] mb-2.5 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-white">1. Instant Ingest</h3>
              <p className="text-[11px] text-[#788090] mt-1">
                Reads website Markdown & value props via Jina Reader.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111317] border border-[#252A34] text-left hover:border-[#FF6B00]/40 transition-colors group">
              <div className="w-7 h-7 rounded-lg bg-[#1D222B] flex items-center justify-center text-[#FF8533] mb-2.5 group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-white">2. UGC Blueprint</h3>
              <p className="text-[11px] text-[#788090] mt-1">
                Generates viral typography hooks & meme GIF pairs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111317] border border-[#252A34] text-left hover:border-[#FF6B00]/40 transition-colors group">
              <div className="w-7 h-7 rounded-lg bg-[#1D222B] flex items-center justify-center text-[#FF8533] mb-2.5 group-hover:scale-105 transition-transform">
                <Play className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-white">3. Studio Render</h3>
              <p className="text-[11px] text-[#788090] mt-1">
                Composites 30fps vertical MP4 with trending soundtrack.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Auth Card */}
        <div className="w-full max-w-md">
          <div className="bg-[#13151B] border border-[#252A34] rounded-2xl p-7 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Ambient accent top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent" />

            <div className="text-center space-y-2 mb-6">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                Enter the Studio
              </h2>
              <p className="text-xs text-[#8A909E]">
                Sign in to create, preview, and save your UGC marketing videos
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Google OAuth Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loadingGoogle || loadingGuest}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-sm transition-all shadow hover:shadow-lg disabled:opacity-60 cursor-pointer active:scale-[0.99]"
              >
                {loadingGoogle ? (
                  <div className="w-4 h-4 border-2 border-neutral-800 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 flex-none" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-[#252A34] w-full" />
                <span className="bg-[#13151B] px-3 text-[11px] text-[#6B7280] uppercase tracking-wider font-mono">
                  or evaluation mode
                </span>
              </div>

              {/* Demo Guest Sign-In (Guarantees fresh reviewers can test with 0 config!) */}
              <button
                onClick={handleGuestSignIn}
                disabled={loadingGoogle || loadingGuest}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D222B] hover:bg-[#252B37] text-[#D1D5DB] hover:text-white border border-[#2D3342] hover:border-[#FF6B00]/40 font-medium text-xs transition-all cursor-pointer"
              >
                {loadingGuest ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF8533]" />
                )}
                <span>Explore as Demo Creator (Instant Guest Session)</span>
              </button>
            </div>

            {/* Guarantees Note */}
            <div className="mt-6 pt-5 border-t border-[#1F232D] flex items-center justify-center gap-2 text-[11px] text-[#717888]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Standard NextAuth OAuth 2.0 • No credentials stored</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 text-center text-xs text-[#525763] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>© 2026 ReelForge UGC Studio. Powered by Next.js 16, FFmpeg, Jina & Gemini.</div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Full 9:16 Vertical HD</span>
          <span>•</span>
          <span>Kinetic Typography</span>
          <span>•</span>
          <span>Beat Sync</span>
        </div>
      </footer>
    </div>
  );
}
