import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserVideos, saveUserVideo, deleteUserVideo } from '@/lib/user-videos';
import { SavedVideo } from '@/types/chat';

export async function GET(_req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || session?.user?.email;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videos = getUserVideos(userId);
  return NextResponse.json({ videos });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || session?.user?.email;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { videoUrl, detectedUrl, hookText, blueprint } = body;

    if (!videoUrl || !detectedUrl) {
      return NextResponse.json({ error: 'Missing videoUrl or detectedUrl' }, { status: 400 });
    }

    const newVideo: SavedVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: session.user?.id || userId,
      userEmail: session.user?.email || 'user@reelforge.ai',
      userName: session.user?.name || undefined,
      videoUrl,
      detectedUrl,
      hookText: hookText || blueprint?.hook_text || '',
      blueprint: blueprint || {
        hook_text: hookText || '',
        gif_search_term: '',
        background_video: '',
        audio_track: '',
      },
      createdAt: new Date().toISOString(),
    };

    saveUserVideo(newVideo);
    return NextResponse.json({ video: newVideo }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save video' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || session?.user?.email;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('id');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }

  const deleted = deleteUserVideo(videoId, userId);
  return NextResponse.json({ success: deleted });
}
