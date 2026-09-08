'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Film,
  ExternalLink,
  Bot,
  User,
  Loader2,
  Globe,
  RefreshCw,
  Download,
} from 'lucide-react';
import { ChatMessage, ChatApiResponse, PipelineStage } from '@/types/chat';

const STARTER_PROMPTS = [
  'Hi there!',
  'Here is my site: calai.app',
  'Generate a video for linear.app',
  'How does this work?',
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Welcome to the UGC Video Generator. Paste any product or startup URL (e.g. `calai.app`), and I'll extract its context, write a viral hook, and generate a 5–10s UGC marketing video.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) {
      setInput('');
    }
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data: ChatApiResponse = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'No response received.',
        detectedUrl: data.detectedUrl,
        stage: data.stage,
        videoUrl: data.videoUrl,
        error: data.error,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, an unexpected error occurred while communicating with the server.',
        error: err instanceof Error ? err.message : 'Network error',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Chat reset. Share a product or website URL (like `calai.app`), and I'll generate a UGC video for it.",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#121214] text-zinc-200">
      {/* Top Navbar */}
      <header className="flex-none border-b border-zinc-800/80 bg-[#161619]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-100">
            <Film className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              UGC Video Generator
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Pipeline Active
              </span>
            </h1>
            <p className="text-xs text-zinc-500">Zero-cost AI marketing video assembler</p>
          </div>
        </div>

        <button
          onClick={resetChat}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-md hover:bg-zinc-800/60 border border-zinc-800 transition"
          title="Reset conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </header>

      {/* Message Thread */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 max-w-3xl w-full mx-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="flex-none w-8 h-8 rounded-full bg-zinc-800/90 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
                <Bot className="w-4 h-4 text-zinc-300" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 rounded-tr-sm shadow-sm'
                  : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800/90 rounded-tl-sm shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Detected URL Badge */}
              {msg.detectedUrl && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-mono overflow-hidden">
                    <Globe className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                    <span className="truncate">{msg.detectedUrl}</span>
                  </div>
                  <a
                    href={msg.detectedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition"
                  >
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Pipeline Stage Status Card */}
              {msg.stage && (
                <div className="mt-3 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs">
                  <div className="font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    UGC Pipeline State
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div
                      className={`p-1.5 rounded border text-center ${
                        msg.stage === 'extracting' || msg.blueprint
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-medium'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      ✓ 1. Jina Scrape
                    </div>
                    <div
                      className={`p-1.5 rounded border text-center ${
                        msg.blueprint || msg.stage === 'generating_script'
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-medium'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {msg.blueprint ? '✓ 2. Gemini Brain' : '2. Gemini Brain'}
                    </div>
                    <div
                      className={`p-1.5 rounded border text-center ${
                        msg.stage === 'assembling_video'
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-medium'
                          : msg.stage === 'completed'
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-medium'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      3. FFmpeg Video
                    </div>
                  </div>
                </div>
              )}

              {/* UGC Video Blueprint Card */}
              {msg.blueprint && (
                <div className="mt-3 p-3.5 rounded-xl bg-zinc-950/85 border border-zinc-800 text-xs space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> UGC Video Blueprint
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      Gemini Extracted
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-400 font-medium mb-1">Viral Hook Overlay:</div>
                    <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-100 font-medium text-xs">
                      &ldquo;{msg.blueprint.hook_text}&rdquo;
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500 font-medium">Meme GIF Search</div>
                      <div className="text-zinc-200 font-mono text-[11px] truncate mt-0.5">
                        {msg.blueprint.gif_search_term}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500 font-medium">Background Video</div>
                      <div className="text-zinc-200 font-mono text-[11px] truncate mt-0.5">
                        {msg.blueprint.background_video}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500 font-medium">Audio Track</div>
                      <div className="text-zinc-200 font-mono text-[11px] truncate mt-0.5">
                        {msg.blueprint.audio_track}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Player Preview (when videoUrl is ready) */}
              {msg.videoUrl && (
                <div className="mt-3 p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-emerald-400" /> Rendered UGC Video (9:16)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                      ✓ Ready
                    </span>
                  </div>

                  <div className="flex justify-center bg-black/60 rounded-lg p-2 border border-zinc-800/80">
                    <video
                      src={msg.videoUrl}
                      controls
                      playsInline
                      className="rounded-md max-h-96 w-auto aspect-[9/16] bg-black shadow-md"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-zinc-500 font-mono">1080x1920 • 30fps</span>
                    <a
                      href={msg.videoUrl}
                      download="ugc-marketing-video.mp4"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download MP4
                    </a>
                  </div>
                </div>
              )}

              {/* Error Callout */}
              {msg.error && (
                <div className="mt-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">
                  {msg.error}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="flex-none w-8 h-8 rounded-full bg-zinc-700/80 border border-zinc-600/50 flex items-center justify-center text-zinc-200">
                <User className="w-4 h-4 text-zinc-200" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-zinc-800/90 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
              <Bot className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Analyzing message...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Bottom Input Area */}
      <footer className="flex-none border-t border-zinc-800/80 bg-[#141416]/95 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Quick Suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-zinc-500 text-[11px] flex-none">Quick prompts:</span>
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="flex-none px-2.5 py-1 rounded-full bg-zinc-800/70 hover:bg-zinc-700/70 text-zinc-300 border border-zinc-700/50 transition disabled:opacity-50 text-[11px]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/60 focus-within:border-zinc-500 rounded-xl px-3.5 py-2 shadow-inner transition">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Drop a product URL (e.g. 'Here is my site: calai.app') or say hi..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex-none p-2 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-zinc-100 transition shadow"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
