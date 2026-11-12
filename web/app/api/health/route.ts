import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getFfprobePath } from '@/lib/ffmpeg-binaries';

export const dynamic = 'force-dynamic';

/**
 * Liveness plus a readiness view of the things that silently degrade:
 * whether the AI key is present, whether storage is configured, and whether
 * ffprobe exists (without it, renders cannot be verified).
 */
export async function GET() {
  const checks = {
    ai: env.gemini.configured,
    storage: env.storage.configured || !env.isProduction,
    renderVerification: getFfprobePath() !== null,
    auth: env.auth.googleConfigured || env.auth.demoGuestEnabled,
  };

  const degraded = Object.values(checks).some((ok) => !ok);

  return NextResponse.json(
    {
      status: degraded ? 'degraded' : 'ok',
      checks,
      environment: env.nodeEnv,
      time: new Date().toISOString(),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
