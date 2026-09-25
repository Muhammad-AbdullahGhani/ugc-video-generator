'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { ArrowRight, Copy, Check, X, ExternalLink, ShieldCheck } from 'lucide-react';

export default function SignInScreen() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.googleConfigured === 'boolean') {
          setGoogleConfigured(data.googleConfigured);
        }
      })
      .catch(() => {
        setGoogleConfigured(false);
      });
  }, []);

  const handleGoogleSignIn = async () => {
    if (googleConfigured === false) {
      setShowConfigModal(true);
      return;
    }

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
      setShowConfigModal(false);
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

  const copyEnvSnippet = () => {
    const snippet = `GOOGLE_CLIENT_ID="your_google_client_id_here"\nGOOGLE_CLIENT_SECRET="your_google_client_secret_here"`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-[var(--paper)] text-[var(--ink)] p-6 sm:p-10 font-sans">
      {/* Top Bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="wordmark text-[17px]">ReelForge</span>
          <span className="text-[12px] text-[var(--ink-soft)]">UGC Studio</span>
        </div>
        <span className="text-[12px] text-[var(--ink-soft)] tabular-nums">9:16 Vertical</span>
      </header>

      {/* Main Content */}
      <main className="my-auto py-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12 max-w-5xl mx-auto w-full">
        {/* Left Column: Proposition */}
        <div className="max-w-xl space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.12]">
              Paste a product link. Get a short UGC reel.
            </h1>
            <p className="text-[15px] sm:text-[17px] leading-relaxed text-[var(--ink-soft)]">
              ReelForge reads page positioning and metrics, composes a kinetic hook, pairs vertical video telemetry with trending sound, and renders a 9:16 export.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-[var(--rule)] pt-5 text-[13px]">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] block mb-1">
                Ingest
              </span>
              <p className="text-[var(--ink)] leading-snug">Scrapes live copy & OG metadata</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] block mb-1">
                Curate
              </span>
              <p className="text-[var(--ink)] leading-snug">Category footage, sound & gif</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] block mb-1">
                Render
              </span>
              <p className="text-[var(--ink)] leading-snug">FFmpeg 30fps vertical MP4</p>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div className="w-full max-w-sm rounded-2xl border border-[var(--rule)] p-6 sm:p-7 space-y-5 bg-[var(--paper)]">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">Enter Studio</h2>
            <p className="text-[13px] text-[var(--ink-soft)] mt-0.5">
              Sign in to cut and save marketing reels.
            </p>
          </div>

          <div className="space-y-3">
            {/* 1-Click Instant Guest */}
            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={loadingGoogle || loadingGuest}
              className="press w-full rounded-xl bg-[var(--ink)] text-[var(--paper)] py-3 px-4 text-[14px] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loadingGuest ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Explore as Demo Creator</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-[var(--rule)] w-full" />
              <span className="bg-[var(--paper)] px-3 text-[11px] uppercase tracking-wider text-[var(--ink-soft)]">
                or
              </span>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loadingGoogle || loadingGuest}
              className="press w-full rounded-xl border border-[var(--rule)] bg-transparent hover:border-[var(--ink)] py-2.5 px-4 text-[13px] font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
            >
              {loadingGoogle ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4 flex-none" viewBox="0 0 24 24">
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
              {googleConfigured === false && (
                <span className="ml-auto text-[10px] text-[var(--ink-soft)] underline">Setup</span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-[var(--rule)] text-[11px] text-[var(--ink-soft)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>NextAuth OAuth 2.0 • No credentials stored</span>
          </div>
        </div>
      </main>

      {/* Google OAuth Setup Guidance Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold">Google OAuth Setup</h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="press p-1 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed">
              Google OAuth credentials have not been configured in <code className="font-mono text-[var(--ink)]">web/.env.local</code>. You can sign in immediately as Demo Creator, or configure Google credentials below:
            </p>

            <div className="rounded-xl border border-[var(--rule)] p-3 text-[12px] space-y-2 bg-[var(--paper)]">
              <div className="flex items-center justify-between text-[var(--ink-soft)]">
                <span>Add to web/.env.local:</span>
                <button
                  type="button"
                  onClick={copyEnvSnippet}
                  className="press inline-flex items-center gap-1 underline underline-offset-2"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="font-mono text-[11px] p-2.5 rounded bg-black/5 dark:bg-white/5 overflow-x-auto">
{`GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"`}
              </pre>
              <p className="text-[11px] text-[var(--ink-soft)]">
                Redirect URI: <span className="font-mono text-[var(--ink)]">http://localhost:3000/api/auth/callback/google</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 text-[12px]">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--ink)] underline underline-offset-2"
              >
                <span>Google Cloud Console</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="button"
                onClick={handleGuestSignIn}
                className="press font-medium underline underline-offset-2"
              >
                Continue as Demo Creator →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-[var(--ink-soft)] border-t border-[var(--rule)] pt-4">
        <span>ReelForge Studio</span>
        <span>Deterministic FFmpeg engine • 9:16 export</span>
      </footer>
    </div>
  );
}
