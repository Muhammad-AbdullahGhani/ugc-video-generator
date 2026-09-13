'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Copy,
  Check,
  Film,
  Sparkles,
  Share2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VideoBlueprint } from '@/types/chat';

interface VideoPlayerProps {
  videoUrl: string;
  detectedUrl?: string;
  blueprint?: VideoBlueprint;
  autoPlay?: boolean;
}

export default function VideoPlayer({
  videoUrl,
  blueprint,
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
        setCurrentTime(video.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration || 7);
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay policy prevented playback
        });
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(100);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [videoUrl, autoPlay]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const newTime = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setProgress(parseFloat(e.target.value));
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDownloading(true);
      const filename = `reelforge-${Date.now()}.mp4`;

      if (videoUrl.startsWith('blob:') || videoUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.warn('Direct blob download failed, opening URL:', err);
      window.open(videoUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(videoUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const remaining = s % 60;
    return `${m}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="w-full rounded-2xl bg-[#14171E] border border-[#252A34] overflow-hidden shadow-xl transition-all">
      {/* Player Header */}
      <div className="px-4 py-3 border-b border-[#252A34] bg-[#111317]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-pulse" />
          <span className="font-display font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#FF8533]" /> UGC Video Player (9:16)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#FF8533] bg-[#FF6B00]/10 border border-[#FF6B00]/30 px-2 py-0.5 rounded-full">
            1080x1920 • 30fps
          </span>
          <button
            onClick={handleCopyLink}
            title="Copy video link"
            className="p-1.5 rounded-lg bg-[#1C2028] hover:bg-[#252B36] text-[#9CA3AF] hover:text-white border border-[#2A303C] transition cursor-pointer"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="p-4 flex flex-col items-center justify-center bg-[#0C0D11]">
        <div
          ref={containerRef}
          onClick={togglePlay}
          className="relative max-w-[280px] sm:max-w-[320px] w-full aspect-[9/16] rounded-xl overflow-hidden bg-black shadow-2xl cursor-pointer group select-none border border-[#252A34]"
        >
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            loop
            className="w-full h-full object-cover"
          />

          {/* Big Center Play/Pause button on hover or when paused */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}
          >
            <div className="w-13 h-13 rounded-full bg-[#FF6B00]/90 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-0.5" />
              )}
            </div>
          </div>

          {/* Quick Mute button overlay in corner */}
          <button
            onClick={toggleMute}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/80 transition"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Bottom In-Video Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-6 space-y-2"
          >
            {/* Scrubber */}
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
            />

            <div className="flex items-center justify-between text-[11px] text-white/90 font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="hover:text-[#FF8533] transition"
                  aria-label="Play/Pause"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white" />
                  )}
                </button>
                <span>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="hover:text-[#FF8533] transition"
                  aria-label="Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-3.5 bg-[#121419] border-t border-[#252A34] flex flex-wrap items-center justify-between gap-2.5">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#D1D5DB] px-2.5 py-1.5 rounded-lg bg-[#191D26] border border-[#2A303E] transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF8533]" />
          <span>Blueprint Details</span>
          {showDetails ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191D26] hover:bg-[#232936] text-xs text-[#D1D5DB] hover:text-white border border-[#2A303E] transition cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#FF8533]" />
                <span>Share Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white font-medium text-xs shadow-md shadow-[#FF6B00]/20 transition disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Downloading...' : 'Download MP4'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Blueprint Details */}
      {showDetails && blueprint && (
        <div className="p-4 bg-[#0F1116] border-t border-[#252A34] text-xs space-y-3">
          <div>
            <span className="text-[11px] text-[#717888] font-medium block mb-1">
              Kinetic Hook Script:
            </span>
            <div className="p-2.5 rounded-lg bg-[#151820] border border-[#252A34] text-white font-medium">
              &ldquo;{blueprint.hook_text}&rdquo;
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#151820] border border-[#252A34]">
              <span className="text-[#717888] block">Meme GIF Search</span>
              <span className="font-mono text-[#D1D5DB] truncate block mt-0.5">
                {blueprint.gif_search_term}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#151820] border border-[#252A34]">
              <span className="text-[#717888] block">Vertical Reel</span>
              <span className="font-mono text-[#D1D5DB] truncate block mt-0.5">
                {blueprint.background_video}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#151820] border border-[#252A34]">
              <span className="text-[#717888] block">Soundtrack</span>
              <span className="font-mono text-[#D1D5DB] truncate block mt-0.5">
                {blueprint.audio_track}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
