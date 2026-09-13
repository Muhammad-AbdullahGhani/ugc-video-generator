'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  Send,
  Film,
  ExternalLink,
  User,
  Loader2,
  Globe,
  RefreshCw,
  LogOut,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage, StreamEvent, SavedVideo } from '@/types/chat';
import SignInScreen from '@/components/SignInScreen';
import VideoPlayer from '@/components/VideoPlayer';
import PipelineTracker from '@/components/PipelineTracker';
import EmptyState from '@/components/EmptyState';
import UserVideosDrawer from '@/components/UserVideosDrawer';

export default function ChatInterface() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydratedRef = useRef(false);

  const userKey = session?.user?.id || session?.user?.email || 'guest';
  const storageKey = `reelforge_chat_${userKey}`;

  // Restore chat history from localStorage without blocking initial render
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
                  text: 'An error occurred while communicating with the video generation engine.',
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
    inputRef.current?.focus();
  };

  const handleSelectSavedVideo = (video: SavedVideo) => {
    const historicalMessage: ChatMessage = {
      id: `saved-${video.id}`,
      sender: 'assistant',
      text: `🎬 Restored previously generated UGC marketing video for **${video.detectedUrl}**:

💡 **Decision Rationale:** ${video.blueprint?.rationale || video.rationale || 'Selected tailored assets for this brand.'}`,
      detectedUrl: video.detectedUrl,
      blueprint: video.blueprint,
      videoUrl: video.videoUrl,
      createdAt: video.createdAt,
      rationale: video.rationale || video.blueprint?.rationale,
    };
    setMessages((prev) => [...prev, historicalMessage]);
  };

  const resetChat = () => {
    setMessages([]);
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
      <div className="h-screen bg-[#090A0C] flex flex-col items-center justify-center text-zinc-300">
        <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF8533] mb-3 animate-pulse">
          <Film className="w-5 h-5" />
        </div>
        <p className="text-xs text-[#8A909E] font-mono">Initializing Studio Session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#090A0C] text-[#F3F4F6] font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="flex-none border-b border-[#222733] bg-[#0E1015]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#D95300] flex items-center justify-center text-white shadow-md shadow-[#FF6B00]/20">
            <Film className="w-4 h-4 stroke-[2.2]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm font-bold text-white tracking-tight">
                REELFORGE
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#FF6B00]/15 text-[#FF8533] border border-[#FF6B00]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] mr-1.5 animate-pulse" />
                UGC Studio Active
              </span>
            </div>
            <p className="text-[11px] text-[#717888] hidden sm:block">
              AI Marketing Video Engine • 9:16 Vertical Export
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* User Saved Videos Drawer Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#D1D5DB] hover:text-white px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#1E2330] border border-[#262C3B] transition cursor-pointer"
            title="View saved generations"
          >
            <Layers className="w-3.5 h-3.5 text-[#FF8533]" />
            <span className="hidden sm:inline">My Videos</span>
          </button>

          {/* Reset Conversation */}
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 text-xs text-[#8A909E] hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-[#161922] border border-[#222733] transition cursor-pointer"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* User Account / Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#222733]">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={28}
                height={28}
                unoptimized
                className="w-7 h-7 rounded-full border border-[#FF6B00]/40 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#1C202B] border border-[#2D3444] flex items-center justify-center text-xs font-semibold text-[#FF8533]">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg hover:bg-[#1E222D] text-[#8A909E] hover:text-red-400 transition cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Thread Area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-3xl w-full mx-auto">
        {messages.length === 0 ? (
          <EmptyState onSelectPrompt={sendMessage} disabled={loading} />
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 animate-message-enter ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="flex-none w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B1E28] to-[#12141A] border border-[#282F40] flex items-center justify-center text-[#FF8533] shadow-sm">
                  <Film className="w-4 h-4 stroke-[2]" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-xl rounded-2xl p-4 text-sm leading-relaxed transition-all shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-[#1C202B] text-white border border-[#2E3649] rounded-tr-xs'
                    : 'bg-[#13151B] text-[#E5E7EB] border border-[#232733] rounded-tl-xs'
                }`}
              >
                {/* Main text message */}
                {msg.text && (
                  <div className="whitespace-pre-wrap font-sans text-sm">{msg.text}</div>
                )}

                {/* Detected URL Link Badge */}
                {msg.detectedUrl && (
                  <div className="mt-3 pt-3 border-t border-[#232733] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#D1D5DB] font-mono overflow-hidden">
                      <Globe className="w-3.5 h-3.5 text-[#FF8533] flex-none" />
                      <span className="truncate">{msg.detectedUrl}</span>
                    </div>
                    <a
                      href={msg.detectedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-none inline-flex items-center gap-1 text-[11px] text-[#FF8533] hover:underline"
                    >
                      Visit site <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Streaming Intermediate Status Steps Pipeline */}
                {((msg.steps && msg.steps.length > 0) || msg.isStreaming) && (
                  <div className="mt-3.5">
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

                {/* Real Video Player Component (Rendered once videoUrl is available) */}
                {msg.videoUrl && (
                  <div className="mt-4">
                    <VideoPlayer
                      videoUrl={msg.videoUrl}
                      detectedUrl={msg.detectedUrl}
                      blueprint={msg.blueprint}
                      autoPlay={false}
                    />
                  </div>
                )}

                {/* Error Banner when no pipeline tracker is present */}
                {msg.error && (!msg.steps || msg.steps.length === 0) && (
                  <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-none mt-0.5" />
                    <div className="flex-1">
                      <span>{msg.error}</span>
                      {msg.retryable && (
                        <button
                          onClick={() => handleRetry(msg.detectedUrl || msg.text)}
                          className="mt-2 block px-3 py-1 rounded bg-[#FF6B00] hover:bg-[#FF8533] text-white font-medium text-xs cursor-pointer shadow"
                        >
                          Retry Generation
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="flex-none w-8 h-8 rounded-xl bg-[#262C3B] border border-[#353D52] flex items-center justify-center text-white shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator when assistant is preparing a response */}
        {loading && messages.length > 0 && messages[messages.length - 1]?.sender === 'user' && (
          <div className="flex items-start gap-3 justify-start animate-message-enter">
            <div className="w-8 h-8 rounded-xl bg-[#1B1E28] border border-[#282F40] flex items-center justify-center text-[#FF8533]">
              <Film className="w-4 h-4" />
            </div>
            <div className="bg-[#13151B] border border-[#232733] rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-[#8A909E] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-ping" />
              <span>Analyzing product & assembling video pipeline...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Bottom Input Area */}
      <footer className="flex-none border-t border-[#222733] bg-[#0E1015]/95 backdrop-blur-md px-4 sm:px-6 py-4 z-20">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Input Box */}
          <div className="flex items-center gap-2 bg-[#13161C] border border-[#2A303F] focus-within:border-[#FF6B00]/70 rounded-xl px-3.5 py-2.5 shadow-inner transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste any product URL (e.g. 'calai.app', 'linear.app') or ask a question..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder-[#555D6E] focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex-none p-2 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white disabled:opacity-30 disabled:hover:bg-[#FF6B00] transition-all shadow-md shadow-[#FF6B00]/20 cursor-pointer active:scale-95"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#555D6E] px-1 font-mono">
            <span>Press Enter to assemble</span>
            <span>Zero-Cost • 9:16 Kinetic Video</span>
          </div>
        </div>
      </footer>

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
