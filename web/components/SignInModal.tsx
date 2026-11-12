'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import {
  ArrowRight,
  Copy,
  Check,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SignInModal({
  isOpen,
  onClose,
  onSuccess,
}: SignInModalProps) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  const [guestEnabled, setGuestEnabled] = useState(false);
  const [showConfigSnippet, setShowConfigSnippet] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.googleConfigured === 'boolean') {
          setGoogleConfigured(data.googleConfigured);
        }
        // The guest provider is disabled by default and never runs in
        // production, so the button only appears when the server offers it.
        setGuestEnabled(data.guestEnabled === true);
      })
      .catch(() => {
        setGoogleConfigured(false);
        setGuestEnabled(false);
      });
  }, []);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (googleConfigured === false) {
      setShowConfigSnippet(true);
      return;
    }

    try {
      setLoadingGoogle(true);
      await signIn('google');
      onSuccess?.();
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
        callbackUrl: '/',
      });
      onSuccess?.();
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--rule)] bg-[var(--paper-elevated)] p-6 sm:p-8 shadow-2xl text-[var(--ink)] z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--rule)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] font-semibold">
                [ AUTH // ACCESS ]
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-1">Enter ReelForge Studio</h2>
            <p className="text-[13px] text-[var(--ink-soft)] mt-0.5">
              Cut, review, and persist personalized 9:16 UGC reels.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Demo access. Only offered when the server has the guest provider
              enabled, which never happens in production. */}
          {guestEnabled && (
            <>
              <button
                type="button"
                onClick={handleGuestSignIn}
                disabled={loadingGuest || loadingGoogle}
                className="press w-full rounded-xl bg-[var(--ink)] text-[var(--paper)] py-3.5 px-4 text-[13px] font-mono font-medium flex items-center justify-between hover:bg-[var(--accent)] transition-colors disabled:opacity-50 group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-[var(--accent)] group-hover:text-white transition-colors" />
                  <span>EXPLORE AS DEMO CREATOR</span>
                </div>
                {loadingGuest ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                )}
              </button>

              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-[var(--rule)] w-full" />
                <span className="bg-[var(--paper-elevated)] px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                  OR CONTINUE WITH OAUTH
                </span>
              </div>
            </>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingGuest || loadingGoogle}
            className="press w-full rounded-xl border border-[var(--rule)] bg-transparent hover:border-[var(--ink)] py-3 px-4 text-[13px] font-mono font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
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
            <span>SIGN IN WITH GOOGLE</span>
            {googleConfigured === false && (
              <span className="ml-auto text-[10px] text-[var(--accent)] underline font-mono">
                CONFIG NEEDED
              </span>
            )}
          </button>
        </div>

        {/* Local Setup Guidance Accordion */}
        {showConfigSnippet && (
          <div className="rounded-xl border border-[var(--rule)] bg-[var(--paper-subtle)] p-3.5 space-y-2 text-[12px] font-mono animate-fade-in">
            <div className="flex items-center justify-between text-[var(--ink-soft)]">
              <span className="text-[11px] font-bold">SETUP IN web/.env.local:</span>
              <button
                type="button"
                onClick={copyEnvSnippet}
                className="press inline-flex items-center gap-1 text-[11px] text-[var(--ink)] hover:text-[var(--accent)] underline"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'COPIED' : 'COPY SNIPPET'}</span>
              </button>
            </div>
            <pre className="p-2 rounded bg-black/5 dark:bg-white/5 text-[10px] overflow-x-auto text-[var(--ink)]">
{`GOOGLE_CLIENT_ID="your_google_client_id_here"
GOOGLE_CLIENT_SECRET="your_google_client_secret_here"`}
            </pre>
            <p className="text-[10px] text-[var(--ink-muted)]">
              Redirect URI: <span className="text-[var(--ink)]">http://localhost:3000/api/auth/callback/google</span>
            </p>
          </div>
        )}

        {/* Security / Assessment Notice */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--rule)] text-[11px] font-mono text-[var(--ink-muted)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>NextAuth v5 • Zero Local Password Storage</span>
          </div>
          <span>8x TECHNICAL EVALUATION</span>
        </div>
      </div>
    </div>
  );
}
