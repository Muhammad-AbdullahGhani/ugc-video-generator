'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Trash2, Play, RefreshCw, Film } from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchVideos();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchVideos]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setDeletingId(id);
      const res = await fetch(`/api/videos?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      }
    } catch (err) {
      console.warn('Failed to delete video:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="drawer-panel relative h-full w-full max-w-md border-l border-[var(--rule)] bg-[var(--paper-elevated)] text-[var(--ink)] shadow-2xl flex flex-col z-10 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[var(--accent)] font-semibold">
                [ ARCHIVE // SAVED REELS ]
              </span>
            </div>
            <h3 className="text-base font-bold tracking-tight text-[var(--ink)] mt-0.5">
              Generated Video Library
            </h3>
            <p className="font-mono text-[11px] text-[var(--ink-muted)] truncate max-w-[220px]">
              {userEmail || 'Guest Session Store'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchVideos}
              className="press p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
              title="Refresh list"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="press p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
              title="Close drawer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && videos.length === 0 ? (
            <div className="py-16 text-center font-mono text-[12px] text-[var(--ink-muted)] space-y-2">
              <div className="h-5 w-5 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>LOADING ARCHIVE...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-20 text-center font-mono text-[12px] text-[var(--ink-muted)] space-y-2">
              <Film className="h-6 w-6 mx-auto opacity-40" />
              <p className="font-bold text-[var(--ink)]">NO SAVED REELS</p>
              <p className="text-[11px] font-sans">
                Cut a video in the Studio workbench to build your archive.
              </p>
            </div>
          ) : (
            videos.map((vid) => {
              const label = hostLabel(vid.detectedUrl) || vid.detectedUrl || 'Reel';
              const hook = vid.hookText || vid.blueprint?.hook_text;
              const brandColor = vid.blueprint?.brand_color || '#E53525';

              return (
                <div
                  key={vid.id}
                  onClick={() => {
                    onSelectVideo(vid);
                    onClose();
                  }}
                  className="press group relative rounded-xl border border-[var(--rule)] p-4 hover:border-[var(--ink)] bg-[var(--paper)] transition-all cursor-pointer space-y-2.5"
                >
                  {/* Top line with host and delete */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--rule)] pb-2 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: brandColor }}
                      />
                      <span className="font-bold text-[var(--ink)] truncate">{label}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, vid.id)}
                      disabled={deletingId === vid.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--ink-muted)] hover:text-[var(--accent)] transition-opacity"
                      title="Delete video"
                      aria-label="Delete video"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Hook text */}
                  {hook && (
                    <p className="text-[13px] leading-snug text-[var(--ink-soft)] line-clamp-2 italic">
                      &ldquo;{hook}&rdquo;
                    </p>
                  )}

                  {/* Bottom bar */}
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)] pt-1">
                    <span>
                      {new Date(vid.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <span className="font-bold text-[var(--ink)] flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
                      <Play className="h-3 w-3 fill-current" />
                      <span>LOAD TO STAGE</span>
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
