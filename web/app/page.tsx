'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import LandingPage from '@/components/LandingPage';
import ChatInterface from '@/components/ChatInterface';
import SignInModal from '@/components/SignInModal';
import UserVideosDrawer from '@/components/UserVideosDrawer';
import { SavedVideo } from '@/types/chat';

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'studio'>('overview');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [savedVideosCount, setSavedVideosCount] = useState(0);

  // Fetch count of saved reels for the current user/session
  const refreshSavedCount = useCallback(async () => {
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        // `total` is the full count; `videos` is only the first page.
        if (typeof data.total === 'number') {
          setSavedVideosCount(data.total);
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshSavedCount();
    }, 0);
    return () => clearTimeout(timer);
  }, [session, refreshSavedCount]);

  // Launch studio from Landing page with optional pre-filled prompt
  const handleLaunchStudio = (promptText?: string) => {
    if (promptText) {
      setPendingPrompt(promptText);
    }
    setActiveTab('studio');
  };

  const handleSelectSavedVideo = (video: SavedVideo) => {
    // When a video is selected from drawer, switch to Studio
    setActiveTab('studio');
    // Set a synthetic prompt to view
    setPendingPrompt(`Reel for ${video.detectedUrl}`);
  };

  const handleResetSession = () => {
    const userKey = session?.user?.id || session?.user?.email || 'guest';
    try {
      localStorage.removeItem(`reelforge_chat_${userKey}`);
    } catch {}
    window.location.reload();
  };

  return (
    <div
      className={`flex flex-col bg-[var(--paper)] text-[var(--ink)] font-sans antialiased ${
        activeTab === 'studio' ? 'h-dvh overflow-hidden' : 'min-h-dvh overflow-x-hidden'
      }`}
    >
      {/* Top Swiss Precision Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenArchive={() => setIsArchiveOpen(true)}
        onResetSession={handleResetSession}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        savedCount={savedVideosCount}
      />

      {/* Main View Area */}
      <div
        className={`flex-1 min-h-0 flex flex-col ${
          activeTab === 'studio' ? 'overflow-hidden' : ''
        }`}
      >
        {activeTab === 'overview' ? (
          <LandingPage
            onLaunchStudio={handleLaunchStudio}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isAuthenticated={status === 'authenticated'}
          />
        ) : (
          <ChatInterface
            onOpenArchive={() => setIsArchiveOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            initialPrompt={pendingPrompt}
            onClearInitialPrompt={() => setPendingPrompt(null)}
          />
        )}
      </div>

      {/* Authentication Modal */}
      <SignInModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          refreshSavedCount();
        }}
      />

      {/* User Saved Videos Drawer */}
      <UserVideosDrawer
        isOpen={isArchiveOpen}
        onClose={() => {
          setIsArchiveOpen(false);
          refreshSavedCount();
        }}
        onSelectVideo={handleSelectSavedVideo}
        userEmail={session?.user?.email}
      />
    </div>
  );
}
