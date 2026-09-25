'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  ArrowUp,
  Layers,
  Plus,
  LogOut,
  ExternalLink,
  Globe,
  Loader2,
  Film,
} from 'lucide-react';
import { ChatMessage, StreamEvent, SavedVideo } from '@/types/chat';
import {
  hostLabel,
  isReelMessage,
  deskStatus,
  isCutting,
  readableReply,
} from '@/lib/desk-copy';
import SignInScreen from '@/components/SignInScreen';
import Stage from '@/components/Stage';
import EmptyState from '@/components/EmptyState';
import PipelineTracker from '@/components/PipelineTracker';
import UserVideosDrawer from '@/components/UserVideosDrawer';

export default function ChatInterface() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'desk' | 'stage'>('desk');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydratedRef = useRef(false);

  const userKey = session?.user?.id || session?.user?.email || 'guest';
  const storageKey = `reelforge_chat_${userKey}`;

  // Restore chat history from localStorage
  useEffect(() => {
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized: ChatMessage[] = parsed.map((m: ChatMessage) => ({
              ...m,
              isStreaming: false,
            }));
            setTimeout(() => {
              setMessages(sanitized);
            }, 0);
          }
        }
      } catch (e) {
        console.warn('Failed to load persisted chat history:', e);
      }
    }
  }, [storageKey]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
      } catch (e) {
        console.warn('Failed to persist chat history:', e);
      }
    }
  }, [messages, storageKey]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Find the active reel message to show on Stage
  const activeReelMessage =
    (selectedMessageId ? messages.find((m) => m.id === selectedMessageId) : null) ||
    [...messages].reverse().find(isReelMessage) ||
    null;

  const sendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || input).trim();
      if (!text || loading) return;

      const randomSuffix = Math.random().toString(36).substring(2, 9);
      const userMessageId = `user-${randomSuffix}`;
      const assistantMessageId = `asst-${randomSuffix}`;

      const userMessage: ChatMessage = {
        id: userMessageId,
        sender: 'user',
        text,
        createdAt: new Date().toISOString(),
      };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        sender: 'assistant',
        text: '',
        createdAt: new Date().toISOString(),
        steps: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setSelectedMessageId(assistantMessageId);
      if (!textToSend) {
        setInput('');
      }
      setLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          }),
        });

        if (!response.ok && !response.body) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming not supported or failed to initialize.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            try {
              const rawJson = trimmed.replace(/^data:\s*/, '');
              const event: StreamEvent = JSON.parse(rawJson);

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessageId) return msg;

                  if (event.type === 'step' && event.step) {
                    const existingSteps = [...(msg.steps || [])];
                    const idx = existingSteps.findIndex((s) => s.id === event.step!.id);
                    if (idx >= 0) {
                      existingSteps[idx] = event.step;
                    } else {
                      existingSteps.push(event.step);
                    }

                    return {
                      ...msg,
                      steps: existingSteps,
                      activeStepId:
                        event.step.status === 'active' ? event.step.id : msg.activeStepId,
                      detectedUrl: event.detectedUrl || msg.detectedUrl,
                      blueprint: event.blueprint || msg.blueprint,
                    };
                  }

                  if (event.type === 'chat_thinking') {
                    return {
                      ...msg,
                      text: event.message || 'Formulating reply...',
                    };
                  }

                  if (event.type === 'chat') {
                    return {
                      ...msg,
                      text: event.reply || '',
                      isStreaming: false,
                    };
                  }

                  if (event.type === 'complete') {
                    return {
                      ...msg,
                      text: event.reply || msg.text,
                      detectedUrl: event.detectedUrl || msg.detectedUrl,
                      blueprint: event.blueprint || msg.blueprint,
                      videoUrl: event.videoUrl,
                      rationale: event.rationale || event.blueprint?.rationale,
                      stage: 'completed',
                      isStreaming: false,
                    };
                  }

                  if (event.type === 'error') {
                    const updatedSteps = (msg.steps || []).map((s) =>
                      s.id === event.stepId
                        ? { ...s, status: 'error' as const, error: event.error }
                        : s
                    );

                    return {
                      ...msg,
                      error:
                        event.error || event.message || 'An error occurred during processing.',
                      retryable: event.retryable ?? true,
                      steps: updatedSteps,
                      detectedUrl: event.detectedUrl || msg.detectedUrl,
                      isStreaming: false,
                    };
                  }

                  return msg;
                })
              );
            } catch (parseErr) {
              console.warn('[Stream] Line parse error:', parseErr, line);
            }
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Network error';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  error: errorMsg,
                  retryable: true,
                  isStreaming: false,
                  text: 'Could not connect to the reel generator.',
                }
              : msg
          )
        );
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    },
    [input, loading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRetry = (promptText?: string) => {
    if (promptText) {
      sendMessage(promptText);
    }
  };

  const handleEditUrl = (url: string) => {
    setInput(url);
    setMobileTab('desk');
    inputRef.current?.focus();
  };

  const handleSelectSavedVideo = (video: SavedVideo) => {
    const historicalMessage: ChatMessage = {
      id: `saved-${video.id}`,
      sender: 'assistant',
      text: `Reel for ${video.detectedUrl}.`,
      detectedUrl: video.detectedUrl,
      blueprint: video.blueprint,
      videoUrl: video.videoUrl,
      createdAt: video.createdAt,
      rationale: video.rationale || video.blueprint?.rationale,
    };
    setMessages((prev) => [...prev, historicalMessage]);
    setSelectedMessageId(historicalMessage.id);
    setMobileTab('stage');
  };

  const resetChat = () => {
    setMessages([]);
    setSelectedMessageId(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  // If user is unauthenticated, show the dedicated branded Sign In screen
  if (status === 'unauthenticated') {
    return <SignInScreen />;
  }

  // Loading session state
  if (status === 'loading') {
    return (
      <div className="h-dvh bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center font-sans">
        <span className="wordmark text-[18px]">ReelForge</span>
        <p className="text-[13px] text-[var(--ink-soft)] mt-1">Starting studio…</p>
      </div>
    );
  }

  const working = isCutting(activeReelMessage);

  return (
    <div className="h-dvh flex flex-col bg-[var(--paper)] text-[var(--ink)] font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="flex-none h-14 border-b border-[var(--rule)] px-4 sm:px-6 flex items-center justify-between z-20">
        <div className="flex items-baseline gap-2.5">
          <span className="wordmark text-[16px]">ReelForge</span>
          <span className="text-[12px] text-[var(--ink-soft)] hidden sm:inline">
            {working ? `${deskStatus(activeReelMessage)}…` : deskStatus(activeReelMessage)}
          </span>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex lg:hidden items-center rounded-lg border border-[var(--rule)] p-0.5 text-[12px]">
          <button
            type="button"
            onClick={() => setMobileTab('desk')}
            className={`press px-3 py-1 rounded-md transition-colors ${
              mobileTab === 'desk'
                ? 'bg-[var(--ink)] text-[var(--paper)] font-medium'
                : 'text-[var(--ink-soft)]'
            }`}
          >
            Desk
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('stage')}
            className={`press px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              mobileTab === 'stage'
                ? 'bg-[var(--ink)] text-[var(--paper)] font-medium'
                : 'text-[var(--ink-soft)]'
            }`}
          >
            <span>Reel</span>
            {activeReelMessage?.videoUrl && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--mark)]" />
            )}
          </button>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="press text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center gap-1.5"
            title="Saved reels"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Saved reels</span>
          </button>

          <button
            type="button"
            onClick={resetChat}
            className="press text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center gap-1"
            title="New session"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>

          {/* Account Profile / Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-[var(--rule)]">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={26}
                height={26}
                unoptimized
                className="h-6 w-6 rounded-full object-cover border border-[var(--rule)]"
              />
            ) : (
              <div className="h-6 w-6 rounded-full border border-[var(--rule)] grid place-items-center text-[11px] font-medium text-[var(--ink)]">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            <button
              type="button"
              onClick={() => signOut()}
              className="press p-1 text-[var(--ink-soft)] hover:text-[var(--mark)] transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workbench */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Stage (Persistent workbench on desktop, toggleable on mobile) */}
        <section
          aria-label="Reel Stage"
          className={`flex-1 min-h-0 overflow-y-auto lg:border-r border-[var(--rule)] ${
            mobileTab === 'stage' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <Stage
            message={activeReelMessage}
            onRetry={() =>
              handleRetry(activeReelMessage?.detectedUrl || activeReelMessage?.text)
            }
            onEditUrl={handleEditUrl}
          />
        </section>

        {/* Right Side: Conversation & Desk */}
        <section
          aria-label="Conversation Desk"
          className={`w-full lg:w-[440px] xl:w-[480px] shrink-0 min-h-0 flex flex-col bg-[var(--paper)] ${
            mobileTab === 'desk' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Messages Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.length === 0 ? (
              <EmptyState onSelectPrompt={sendMessage} disabled={loading} />
            ) : (
              messages.map((msg) => {
                const isSelected = activeReelMessage?.id === msg.id;
                const isReel = isReelMessage(msg);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* User Message */}
                    {msg.sender === 'user' && (
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[var(--ink)] text-[var(--paper)] px-3.5 py-2.5 text-[14px] leading-relaxed">
                        {msg.text}
                      </div>
                    )}

                    {/* Assistant Message */}
                    {msg.sender === 'assistant' && (
                      <div className="w-full max-w-[95%] space-y-2.5">
                        {/* Conversational Text */}
                        {msg.text && (
                          <p className="text-[14px] leading-relaxed text-[var(--ink)]">
                            {readableReply(msg.text)}
                          </p>
                        )}

                        {/* External URL badge if detected */}
                        {msg.detectedUrl && (
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-soft)]">
                            <Globe className="h-3 w-3" />
                            <a
                              href={msg.detectedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="press truncate underline decoration-[var(--rule)] underline-offset-2 hover:text-[var(--ink)] inline-flex items-center gap-0.5"
                            >
                              <span>{hostLabel(msg.detectedUrl)}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        )}

                        {/* Pipeline Tracker when steps exist */}
                        {((msg.steps && msg.steps.length > 0) || msg.isStreaming) && (
                          <div className="pt-1">
                            <PipelineTracker
                              steps={msg.steps || []}
                              activeStepId={msg.activeStepId}
                              detectedUrl={msg.detectedUrl}
                              error={msg.error}
                              onRetry={() => handleRetry(msg.detectedUrl || msg.text)}
                              onEditUrl={handleEditUrl}
                            />
                          </div>
                        )}

                        {/* Reel Card Focus Action */}
                        {isReel && msg.videoUrl && (
                          <div className="flex items-center justify-between rounded-xl border border-[var(--rule)] p-2.5 text-[12px]">
                            <div className="flex items-center gap-2">
                              <Film className="h-3.5 w-3.5 text-[var(--ink)]" />
                              <span className="font-medium text-[var(--ink)] truncate max-w-[170px]">
                                {hostLabel(msg.detectedUrl) || '9:16 Reel'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMessageId(msg.id);
                                setMobileTab('stage');
                              }}
                              className={`press underline underline-offset-4 text-[12px] ${
                                isSelected ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-soft)]'
                              }`}
                            >
                              {isSelected ? 'Viewing on Stage' : 'View on Stage →'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Waiting indicator when query is being analyzed */}
            {loading && messages.length > 0 && messages[messages.length - 1]?.sender === 'user' && (
              <div className="text-[13px] text-[var(--ink-soft)] flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Working out what it is…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Desk */}
          <footer className="flex-none border-t border-[var(--rule)] p-3 sm:p-4 bg-[var(--paper)]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--rule)] bg-transparent focus-within:border-[var(--ink)] p-1.5 pl-3 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste a product link (e.g. calai.app) or ask a question…"
                  disabled={loading}
                  className="flex-1 bg-transparent text-[14px] text-[var(--ink)] placeholder-[var(--ink-soft)] focus:outline-none disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="press shrink-0 grid h-8 w-8 place-items-center rounded-lg bg-[var(--ink)] text-[var(--paper)] disabled:opacity-30 transition-opacity"
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--ink-soft)] px-1">
                <span>Enter to assemble</span>
                <span>Zero-cost • 9:16 vertical • 5 to 10s</span>
              </div>
            </div>
          </footer>
        </section>
      </main>

      {/* User Saved Videos Drawer */}
      <UserVideosDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectVideo={handleSelectSavedVideo}
        userEmail={session?.user?.email}
      />
    </div>
  );
}
