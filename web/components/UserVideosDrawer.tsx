'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Trash2, Play, RefreshCw } from 'lucide-react';
import { SavedVideo } from '@/types/chat';
import { hostLabel } from '@/lib/desk-copy';

interface UserVideosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: SavedVideo) => void;
  userEmail?: string | null;
}

export default function UserVideosDrawer({
  isOpen,
  onClose,
  onSelectVideo,
  userEmail,
}: UserVideosDrawerProps) {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.warn('Failed to fetch saved videos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!isOpen) return;

    fetch('/api/videos')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((data) => {
        if (active) setVideos(data.videos || []);
      })
      .catch((err) => console.warn(err));

    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/videos?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      }
    } catch (err) {
      console.warn('Failed to delete video:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="drawer-panel relative h-full w-full max-w-sm border-l border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">Saved Reels</h3>
            <p className="text-[12px] text-[var(--ink-soft)] truncate max-w-[200px]">
              {userEmail || 'Guest session'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchVideos}
              className="press p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)]"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="press p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)]"
              title="Close"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && videos.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[var(--ink-soft)]">
              Loading reels…
            </div>
          ) : videos.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-[var(--ink-soft)] space-y-1">
              <p className="font-medium text-[var(--ink)]">No reels yet</p>
              <p>Paste a product link in the chat to cut a reel.</p>
            </div>
          ) : (
            videos.map((vid) => {
              const label = hostLabel(vid.detectedUrl) || vid.detectedUrl || 'Reel';
              const hook = vid.hookText || vid.blueprint?.hook_text;
              return (
                <div
                  key={vid.id}
                  onClick={() => {
                    onSelectVideo(vid);
                    onClose();
                  }}
                  className="press group relative rounded-xl border border-[var(--rule)] p-3.5 hover:border-[var(--ink)] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-medium truncate group-hover:underline underline-offset-2">
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, vid.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--ink-soft)] hover:text-[var(--mark)] transition-opacity"
                      title="Delete"
                      aria-label="Delete saved reel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {hook && (
                    <p className="mt-1 text-[12px] leading-snug text-[var(--ink-soft)] line-clamp-2">
                      &ldquo;{hook}&rdquo;
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--ink-soft)] border-t border-[var(--rule)] pt-2">
                    <span>
                      {new Date(vid.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1 font-medium group-hover:translate-x-0.5 transition-transform text-[var(--ink)]">
                      <Play className="h-3 w-3 fill-current" />
                      <span>Watch</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
