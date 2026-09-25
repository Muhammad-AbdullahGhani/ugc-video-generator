'use client';

import { ChatMessage } from '@/types/chat';
import { deskStatus, isCutting, prettyAsset } from '@/lib/desk-copy';
import VideoPlayer from '@/components/VideoPlayer';

interface StageProps {
  message: ChatMessage | null;
  onRetry?: () => void;
  onEditUrl?: (url: string) => void;
}

function LayerRow({ name, value }: { name: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 border-t border-[var(--rule)] py-3">
      <span className="text-[13px] text-[var(--ink-soft)]">{name}</span>
      <span className={`min-w-0 text-[15px] leading-snug ${value ? '' : 'text-[var(--ink-soft)]'}`}>
        {value || 'Not yet'}
      </span>
    </div>
  );
}

function EmptyPhone() {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone-screen flex flex-col justify-between p-4">
        <span className="text-[12px] text-white/55">9:16</span>
        <p className="text-[15px] leading-snug font-medium">Send a product link.</p>
        <span className="text-[12px] text-white/55">5 to 10 seconds</span>
      </div>
    </div>
  );
}

export default function Stage({ message, onRetry, onEditUrl }: StageProps) {
  const blueprint = message?.blueprint;
  const working = isCutting(message);

  return (
    <div className="flex h-full items-center justify-center px-4 py-5 lg:px-10 lg:py-8">
      <div className="w-full max-w-[640px]">
        <p className="mb-4 text-[13px] text-[var(--ink-soft)]">
          {working ? `${deskStatus(message)}…` : deskStatus(message)}
        </p>

        <div className="flex items-start gap-5 lg:gap-14">
          <div className="shrink-0">
            {message?.videoUrl ? (
              <VideoPlayer
                key={message.videoUrl}
                videoUrl={message.videoUrl}
                detectedUrl={message.detectedUrl}
                blueprint={blueprint}
              />
            ) : (
              <EmptyPhone />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <LayerRow name="Picture" value={prettyAsset(blueprint?.background_video)} />
            <LayerRow name="Hook" value={blueprint?.hook_text?.trim() || null} />
            <LayerRow name="Sound" value={prettyAsset(blueprint?.audio_track)} />
            <LayerRow name="Gif" value={prettyAsset(blueprint?.gif_search_term)} />

            {blueprint?.rationale && (
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink-soft)]">
                {blueprint.rationale}
              </p>
            )}

            {message?.error && !message.videoUrl && (
              <div className="mt-4">
                <p className="text-[14px] leading-relaxed text-[var(--mark)]">{message.error}</p>
                <div className="mt-2 flex gap-4 text-[13px]">
                  {message.retryable !== false && onRetry && (
                    <button type="button" onClick={onRetry} className="press underline underline-offset-4">
                      Try again
                    </button>
                  )}
                  {message.detectedUrl && onEditUrl && (
                    <button
                      type="button"
                      onClick={() => onEditUrl(message.detectedUrl || '')}
                      className="press text-[var(--ink-soft)] underline decoration-[var(--rule)] underline-offset-4"
                    >
                      Change the link
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
