/**
 * Validated environment configuration.
 *
 * Every environment variable is read exactly once, here, and validated at module
 * load. Nothing else in the codebase may read `process.env` directly — that is how
 * `.env.example` and the code drift apart, and how a missing secret becomes a
 * silent insecure default instead of a failed boot.
 *
 * Hand-rolled on purpose: zero runtime dependencies for something that must run
 * before anything else.
 */

export type RuntimeEnv = 'development' | 'test' | 'production';

class EnvError extends Error {
  constructor(message: string) {
    super(`[env] ${message}`);
    this.name = 'EnvError';
  }
}

function raw(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function firstOf(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw(key);
    if (value) return value;
  }
  return undefined;
}

function bool(key: string, fallback = false): boolean {
  const value = raw(key);
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

function int(key: string, fallback: number, min: number, max: number): number {
  const value = raw(key);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new EnvError(`${key} must be an integer, received "${value}"`);
  }
  return Math.min(max, Math.max(min, parsed));
}

const nodeEnv = (raw('NODE_ENV') ?? 'development') as RuntimeEnv;
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

/**
 * `next build` runs with NODE_ENV=production but without runtime secrets, and it
 * evaluates every module to collect route metadata. Requirements that only make
 * sense for a running server are therefore checked in `assertProductionConfig()`
 * (called from instrumentation at boot) rather than at import time.
 */
const isBuildPhase = raw('NEXT_PHASE') === 'phase-production-build';

/** Serverless platforms give us a read-only filesystem apart from the temp dir. */
const isServerless = Boolean(raw('VERCEL') || raw('AWS_LAMBDA_FUNCTION_NAME'));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const authSecret = firstOf('AUTH_SECRET', 'NEXTAUTH_SECRET');

if (!authSecret && !isTest && !isBuildPhase) {
  throw new EnvError(
    'AUTH_SECRET is required. Generate one with `openssl rand -base64 32` and add it ' +
      'to web/.env.local (or your deployment environment). There is deliberately no ' +
      'default: a hardcoded fallback secret lets anyone forge a session.'
  );
}

if (authSecret && authSecret.length < 32 && isProduction && !isBuildPhase) {
  throw new EnvError('AUTH_SECRET must be at least 32 characters in production.');
}

const googleClientId = raw('GOOGLE_CLIENT_ID');
const googleClientSecret = raw('GOOGLE_CLIENT_SECRET');
const googleConfigured = Boolean(
  googleClientId &&
    googleClientSecret &&
    !googleClientId.includes('your-google-client-id') &&
    !googleClientId.includes('your_google_client_id')
);

/**
 * The demo-guest credentials provider accepts any identity without verification.
 * It is a demo affordance, never a production one, so it is off unless explicitly
 * enabled — and it refuses to switch on in production at all.
 */
const demoGuestRequested = bool('ENABLE_DEMO_GUEST', false);
const demoGuestEnabled = demoGuestRequested && !isProduction;

if (demoGuestRequested && isProduction) {
  // Loud, but not fatal: the app is still safe, the provider simply stays off.
  console.warn(
    '[env] ENABLE_DEMO_GUEST=true was ignored because NODE_ENV=production. ' +
      'The guest provider authenticates anyone as any email and will not run in production.'
  );
}

// ---------------------------------------------------------------------------
// AI + storage
// ---------------------------------------------------------------------------

const geminiApiKey = firstOf('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENAI_API_KEY');
const blobToken = raw('BLOB_READ_WRITE_TOKEN');

// ---------------------------------------------------------------------------
// Exported config
// ---------------------------------------------------------------------------

export const env = {
  nodeEnv,
  isBuildPhase,
  isProduction,
  isTest,
  isServerless,

  /** Canonical origin, used for OAuth redirect URIs and absolute links. */
  appUrl: firstOf('APP_URL', 'NEXTAUTH_URL', 'AUTH_URL') ?? 'http://localhost:3000',

  auth: {
    secret: authSecret ?? 'test-only-secret-not-used-outside-tests-0123456789',
    googleConfigured,
    googleClientId,
    googleClientSecret,
    demoGuestEnabled,
  },

  gemini: {
    apiKey: geminiApiKey,
    configured: Boolean(geminiApiKey),
    model: raw('GEMINI_MODEL') ?? 'gemini-3.6-flash',
    timeoutMs: int('GEMINI_TIMEOUT_MS', 20_000, 1_000, 60_000),
  },

  giphy: {
    apiKey: raw('GIPHY_API_KEY'),
  },

  storage: {
    blobToken,
    configured: Boolean(blobToken),
  },

  render: {
    ffmpegPath: raw('FFMPEG_PATH'),
    ffprobePath: raw('FFPROBE_PATH'),
    /** Hard ceiling on a single encode. Below the route's own budget. */
    timeoutMs: int('RENDER_TIMEOUT_MS', 45_000, 5_000, 120_000),
    /** Simultaneous FFmpeg processes. Each one saturates a core. */
    maxConcurrent: int('RENDER_MAX_CONCURRENT', 2, 1, 16),
    /** Rendered files older than this are swept. */
    retentionMs: int('RENDER_RETENTION_MS', 6 * 60 * 60 * 1000, 60_000, 7 * 24 * 60 * 60 * 1000),
  },

  limits: {
    /** Longest chat message we will process. */
    maxMessageChars: int('MAX_MESSAGE_CHARS', 2_000, 100, 20_000),
    /** How many prior turns we accept from the client. */
    maxHistoryTurns: int('MAX_HISTORY_TURNS', 10, 0, 50),
    /** Cap on any single outbound page fetch. */
    maxFetchBytes: int('MAX_FETCH_BYTES', 2 * 1024 * 1024, 64 * 1024, 32 * 1024 * 1024),
    /** Video generations per user per hour. */
    rendersPerHour: int('RENDERS_PER_HOUR', 10, 1, 1_000),
    /** Chat (non-render) requests per minute, per identity. */
    chatPerMinute: int('CHAT_PER_MINUTE', 20, 1, 1_000),
  },

  /** Where the local JSON store lives when no managed database is configured. */
  dataDir: raw('DATA_DIR'),
} as const;

export type Env = typeof env;

/**
 * Runtime-only configuration gate, called once at server start.
 *
 * Kept out of module evaluation so `next build` — which runs with
 * NODE_ENV=production and no secrets — can still collect route metadata. A
 * misconfigured server still fails to start rather than serving requests it
 * cannot honour.
 */
export function assertProductionConfig(): void {
  if (!isProduction || isBuildPhase) return;

  const missing: string[] = [];

  if (!authSecret) missing.push('AUTH_SECRET');
  if (!blobToken) {
    missing.push(
      'BLOB_READ_WRITE_TOKEN (rendered videos must go to storage you control; there is no public-host fallback)'
    );
  }
  if (!geminiApiKey) missing.push('GEMINI_API_KEY');

  if (missing.length > 0) {
    throw new EnvError(`missing required production configuration: ${missing.join(', ')}`);
  }
}
