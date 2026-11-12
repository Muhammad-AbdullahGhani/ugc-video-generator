/**
 * Runs once per server start, before the first request.
 *
 * `lib/env` validates configuration at import time, so pulling it in here turns
 * a missing secret into a failed boot rather than a 500 on the first request
 * that happens to need it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { env, assertProductionConfig } = await import('./lib/env');
  const { createLogger } = await import('./lib/logger');
  const { assertDurableStore } = await import('./lib/user-videos');
  const { getFfprobePath } = await import('./lib/ffmpeg-binaries');

  const log = createLogger('boot');

  // Fails the server start rather than the first request that needs the value.
  assertProductionConfig();
  assertDurableStore();

  if (!getFfprobePath()) {
    log.warn(
      'ffprobe is unavailable — renders will be reported as unverified rather than validated'
    );
  }

  log.info('server ready', {
    environment: env.nodeEnv,
    googleAuth: env.auth.googleConfigured,
    guestAuth: env.auth.demoGuestEnabled,
    ai: env.gemini.configured,
    blobStorage: env.storage.configured,
    maxConcurrentRenders: env.render.maxConcurrent,
  });
}
