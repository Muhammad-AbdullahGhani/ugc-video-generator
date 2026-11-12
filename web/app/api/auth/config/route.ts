import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Tells the sign-in UI which providers are actually available.
 *
 * The redirect URI is derived from the configured app URL rather than
 * hardcoded to localhost, which was wrong on every deployment.
 */
export async function GET() {
  return NextResponse.json(
    {
      googleConfigured: env.auth.googleConfigured,
      guestEnabled: env.auth.demoGuestEnabled,
      redirectUri: new URL('/api/auth/callback/google', env.appUrl).toString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
