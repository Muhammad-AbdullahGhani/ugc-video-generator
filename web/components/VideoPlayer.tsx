'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { VideoBlueprint } from '@/types/chat';
import { hostLabel } from '@/lib/desk-copy';

interface VideoPlayerProps {
  videoUrl: string;
  detectedUrl?: string;
  blueprint?: VideoBlueprint;
  autoPlay?: boolean;
}

export default function VideoPlayer({
  videoUrl,
  detectedUrl,
  blueprint,
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!video.duration) return;
      setProgress((video.currentTime / video.duration) * 100);
      setCurrentTime(video.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      if (autoPlay) {
        video.play().catch(() => {});
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

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
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = (event: React.MouseEvent) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video?.duration) return;
    const next = (parseFloat(event.target.value) / 100) * video.duration;
    video.currentTime = next;
    setProgress(parseFloat(event.target.value));
  };

  const toggleFullscreen = (event: React.MouseEvent) => {
    event.stopPropagation();
    const node = screenRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      node.requestFullscreen().catch(() => {});
    }
  };

  const handleDownload = async () => {
    const host = hostLabel(detectedUrl || blueprint?.source_url) || 'reel';
    const filename = `reel-${host}.mp4`;
    try {
      setIsDownloading(true);
      if (videoUrl.startsWith('blob:') || videoUrl.startsWith('data:')) {
        const anchor = document.createElement('a');
        anchor.href = videoUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return;
      }
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1600);
    } catch {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formatTime = (secs: number) => {
    const total = Math.max(0, Math.floor(secs));
    const minutes = Math.floor(total / 60);
    const remain = total % 60;
    return `${minutes}:${remain < 10 ? '0' : ''}${remain}`;
  };

  return (
    <div>
      <div className="phone">
        <div
          ref={screenRef}
          onClick={togglePlay}
          className="phone-screen cursor-pointer select-none"
        >
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            loop
            className="h-full w-full object-cover"
          />

          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f4efe6] text-[#161411]">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="absolute top-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-8 pb-2.5"
          >
            <input
              className="scrub"
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeek}
              aria-label="Seek"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/85 tabular-nums">
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
              </button>
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen">
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[13px]">
        <button type="button" onClick={handleDownload} disabled={isDownloading} className="press underline decoration-[var(--rule)] underline-offset-4">
          {isDownloading ? 'Saving…' : 'Download'}
        </button>
        <button type="button" onClick={handleCopy} className="press text-[var(--ink-soft)] underline decoration-[var(--rule)] underline-offset-4">
          {isCopied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
