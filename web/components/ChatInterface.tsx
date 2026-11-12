'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  ArrowUp,
  Globe,
  Loader2,
  Film,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, StreamEvent } from '@/types/chat';
import {
  hostLabel,
  isReelMessage,
  readableReply,
} from '@/lib/desk-copy';
import Stage from '@/components/Stage';
import EmptyState from '@/components/EmptyState';
import PipelineTracker from '@/components/PipelineTracker';

interface ChatInterfaceProps {
  onOpenArchive: () => void;
  onOpenAuthModal: () => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export default function ChatInterface({
  onOpenArchive,
  onOpenAuthModal,
  initialPrompt,
  onClearInitialPrompt,
}: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'stage' | 'desk'>('desk');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydratedRef = useRef(false);
  // Lets us abort the in-flight generation; the server stops the encode when
  // the stream is cancelled rather than rendering for nobody.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

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

  // Send message function connecting to live SSE /api/chat
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

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
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
        // A cancel is our own doing, not a failure worth showing.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
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
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    },
    [input, loading, messages]
  );

  // Consume initial prompt if passed from Landing Page
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const promptToRun = initialPrompt;
      onClearInitialPrompt?.();
      const timer = setTimeout(() => {
        sendMessage(promptToRun);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, sendMessage, onClearInitialPrompt]);

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

  const resetChat = () => {
    setMessages([]);
    setSelectedMessageId(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--paper)] text-[var(--ink)] font-sans overflow-hidden">
      {/* Mobile Workbench Mode Switcher */}
      <div className="lg:hidden flex items-center justify-between border-b border-[var(--rule)] px-4 py-2 bg-[var(--paper-subtle)] font-mono text-[12px]">
        <span className="text-[var(--ink-muted)]">VIEW MODE:</span>
        <div className="flex items-center rounded-lg border border-[var(--rule)] p-0.5 bg-[var(--paper-elevated)]">
          <button
            type="button"
            onClick={() => setMobileTab('desk')}
            className={`px-3 py-1 rounded text-[11px] font-bold ${
              mobileTab === 'desk'
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'text-[var(--ink-soft)]'
            }`}
          >
            DESK
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('stage')}
            className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 ${
              mobileTab === 'stage'
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'text-[var(--ink-soft)]'
            }`}
          >
            <span>STAGE</span>
            {activeReelMessage?.videoUrl && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Workbench (Asymmetrical split) */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Stage (Persistent video canvas & telemetry) */}
        <section
          aria-label="Reel Stage"
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain lg:border-r border-[var(--rule)] bg-[var(--paper)] ${
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

        {/* Right Side: Conversation Desk & Telemetry Log */}
        <section
          aria-label="Conversation Desk"
          className={`w-full lg:w-[460px] xl:w-[500px] shrink-0 min-h-0 flex flex-col bg-[var(--paper-elevated)] border-l lg:border-l-0 border-[var(--rule)] ${
            mobileTab === 'desk' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Top Desk Toolbar */}
          <div className="flex-none px-4 py-2.5 border-b border-[var(--rule)] flex items-center justify-between font-mono text-[11px] text-[var(--ink-muted)]">
            <div className="flex items-center gap-2">
              <span className="text-[var(--accent)] font-bold">[ DESK // 02 ]</span>
              <span>INTERACTIVE TERMINAL</span>
            </div>
            <div className="flex items-center gap-2.5">
              {!session?.user && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="press text-[10px] text-[var(--accent)] hover:underline font-bold"
                  title="Authenticate session"
                >
                  SIGN IN
                </button>
              )}
              <button
                type="button"
                onClick={onOpenArchive}
                className="press text-[11px] hover:text-[var(--ink)] flex items-center gap-1"
                title="Open saved reels"
              >
                <Film className="h-3 w-3" />
                <span>ARCHIVE</span>
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={resetChat}
                  className="press text-[11px] hover:text-[var(--ink)] flex items-center gap-1 border-l border-[var(--rule)] pl-2"
                  title="Clear current thread"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>CLEAR</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
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
                    {/* User Prompt Message */}
                    {msg.sender === 'user' && (
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[var(--ink)] text-[var(--paper)] px-4 py-2.5 text-[14px] leading-relaxed font-mono">
                        {msg.text}
                      </div>
                    )}

                    {/* Assistant Message */}
                    {msg.sender === 'assistant' && (
                      <div className="w-full max-w-[95%] space-y-3">
                        {/* Text Reply */}
                        {msg.text && (
                          <div className="p-3.5 rounded-xl border border-[var(--rule)] bg-[var(--paper)] text-[13px] leading-relaxed text-[var(--ink)] space-y-1">
                            <span className="font-mono text-[10px] text-[var(--accent)] font-bold block uppercase tracking-wider">
                              [ REELFORGE RESPONSE ]
                            </span>
                            <p>{readableReply(msg.text)}</p>
                          </div>
                        )}

                        {/* External URL badge */}
                        {msg.detectedUrl && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
                            <Globe className="h-3 w-3" />
                            <a
                              href={msg.detectedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="press truncate underline hover:text-[var(--ink)] inline-flex items-center gap-0.5"
                            >
                              <span>{hostLabel(msg.detectedUrl)}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        )}

                        {/* Pipeline Tracker */}
                        {((msg.steps && msg.steps.length > 0) || msg.isStreaming) && (
                          <div>
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

                        {/* Reel Focus Card */}
                        {isReel && msg.videoUrl && (
                          <div className="flex items-center justify-between rounded-xl border border-[var(--rule)] bg-[var(--paper)] p-3 text-[12px] font-mono">
                            <div className="flex items-center gap-2">
                              <Film className="h-3.5 w-3.5 text-[var(--accent)]" />
                              <span className="font-bold text-[var(--ink)] truncate max-w-[180px]">
                                {hostLabel(msg.detectedUrl) || '9:16 REEL'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMessageId(msg.id);
                                setMobileTab('stage');
                              }}
                              className={`press underline text-[11px] font-bold ${
                                isSelected
                                  ? 'text-[var(--accent)]'
                                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                              }`}
                            >
                              {isSelected ? 'INSPECTING ON STAGE' : 'VIEW ON STAGE →'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Waiting Spinner */}
            {loading &&
              messages.length > 0 &&
              messages[messages.length - 1]?.sender === 'user' && (
                <div className="font-mono text-[12px] text-[var(--ink-muted)] flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                  <span>ANALYZING TARGET URL & VALUE PROPS...</span>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Desk Bar */}
          <footer className="flex-none border-t border-[var(--rule)] p-3 sm:p-4 bg-[var(--paper-elevated)] space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--rule)] bg-[var(--paper)] focus-within:border-[var(--ink)] p-1.5 pl-3 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste product link (e.g. calai.app) or ask a question..."
                disabled={loading}
                className="flex-1 bg-transparent font-mono text-[13px] text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="press shrink-0 grid h-8 w-8 place-items-center rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] disabled:opacity-30 transition-colors"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-current" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)] px-1">
              <span>PRESS ENTER TO ASSEMBLE</span>
              <span>1080×1920 • 30FPS • 5–10S</span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
