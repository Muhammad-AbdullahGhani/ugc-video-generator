'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Film,
  Trash2,
  Play,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { SavedVideo } from '@/types/chat';

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
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#121419] border-l border-[#252A34] h-full shadow-2xl flex flex-col z-10 font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#252A34] flex items-center justify-between bg-[#151820]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF8533]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-white">
                My Video Generations
              </h3>
              <p className="text-[11px] text-[#8A909E] font-mono truncate max-w-[200px]">
                {userEmail || 'Account Studio'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchVideos}
              className="p-1.5 rounded-lg hover:bg-[#1E222D] text-[#8A909E] hover:text-white transition"
              title="Refresh videos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#1E222D] text-[#8A909E] hover:text-white transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && videos.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8A909E]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FF6B00] mb-2" />
              Loading your generated videos...
            </div>
          ) : videos.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#191D26] border border-[#252B38] flex items-center justify-center mx-auto text-[#6B7280]">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">No videos generated yet</h4>
                <p className="text-xs text-[#8A909E] mt-1 max-w-xs mx-auto">
                  Paste a product URL into the chat to assemble your first UGC marketing video!
                </p>
              </div>
            </div>
          ) : (
            videos.map((vid) => (
              <div
                key={vid.id}
                onClick={() => {
                  onSelectVideo(vid);
                  onClose();
                }}
                className="p-3.5 rounded-xl bg-[#161921] hover:bg-[#1B202A] border border-[#252A34] hover:border-[#FF6B00]/40 transition-all cursor-pointer group relative"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-white group-hover:text-[#FF8533] transition-colors truncate">
                    {vid.detectedUrl}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, vid.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-950/40 text-red-400 transition"
                    title="Delete saved record"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[11px] text-[#9CA3AF] line-clamp-2 italic mb-2.5">
                  &ldquo;{vid.hookText || vid.blueprint?.hook_text}&rdquo;
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono pt-2 border-t border-[#232834]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(vid.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <span className="flex items-center gap-1 text-[#FF8533] font-medium group-hover:translate-x-0.5 transition-transform">
                    <Play className="w-3 h-3 fill-current" />
                    <span>View Video</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
