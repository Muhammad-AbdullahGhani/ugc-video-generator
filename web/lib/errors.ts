/**
 * Error taxonomy and sanitization.
 *
 * Internal failures — FFmpeg stderr, SDK exceptions, raw model output — must never
 * reach the browser. They leak file paths, versions, quota state and internal
 * structure. Instead every failure maps to a stable code plus a message written
 * for a user, and the detail is logged against the request id.
 */

import type { Logger } from './logger';

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'URL_NOT_ALLOWED'
  | 'URL_UNREACHABLE'
  | 'PAGE_TOO_THIN'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_OUTPUT'
  | 'ASSET_UNAVAILABLE'
  | 'RENDER_FAILED'
  | 'RENDER_BUSY'
  | 'STORAGE_FAILED'
  | 'NOT_FOUND'
  | 'INTERNAL';

/** What the user is told. Never interpolate internal state into these. */
const USER_MESSAGE: Record<ErrorCode, string> = {
  INVALID_REQUEST: 'That request did not look right. Check the input and try again.',
  UNAUTHORIZED: 'Sign in to generate a reel.',
  RATE_LIMITED: 'You have hit the limit for now. Give it a minute and try again.',
  URL_NOT_ALLOWED: 'That URL cannot be fetched. Use a public https:// product page.',
  URL_UNREACHABLE: 'That page could not be reached. Check the URL and try again.',
  PAGE_TOO_THIN: 'That page did not have enough content to work from.',
  AI_UNAVAILABLE: 'The analysis service is busy right now. Try again shortly.',
  AI_INVALID_OUTPUT: 'The analysis came back unusable. Try again.',
  ASSET_UNAVAILABLE: 'A media asset was missing, so the reel could not be assembled.',
  RENDER_FAILED: 'The video could not be rendered. Try again.',
  RENDER_BUSY: 'Too many videos are rendering right now. Try again in a moment.',
  STORAGE_FAILED: 'The video rendered but could not be saved. Try again.',
  NOT_FOUND: 'That item no longer exists.',
  INTERNAL: 'Something went wrong on our side.',
};

const STATUS: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  URL_NOT_ALLOWED: 400,
  URL_UNREACHABLE: 502,
  PAGE_TOO_THIN: 422,
  AI_UNAVAILABLE: 503,
  AI_INVALID_OUTPUT: 502,
  ASSET_UNAVAILABLE: 500,
  RENDER_FAILED: 500,
  RENDER_BUSY: 503,
  STORAGE_FAILED: 500,
  NOT_FOUND: 404,
  INTERNAL: 500,
};

/** Codes where retrying the identical request can plausibly succeed. */
const RETRYABLE = new Set<ErrorCode>([
  'URL_UNREACHABLE',
  'AI_UNAVAILABLE',
  'AI_INVALID_OUTPUT',
  'RENDER_FAILED',
  'RENDER_BUSY',
  'STORAGE_FAILED',
  'RATE_LIMITED',
  'INTERNAL',
]);

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Internal detail: logged, never serialized to the client. */
  readonly detail?: string;
  readonly cause?: unknown;

  constructor(code: ErrorCode, detail?: string, cause?: unknown) {
    super(detail ?? code);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
    this.cause = cause;
  }

  get status(): number {
    return STATUS[this.code];
  }

  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }

  get userMessage(): string {
    return USER_MESSAGE[this.code];
  }
}

/** Coerce anything thrown into an AppError without losing the detail. */
export function toAppError(err: unknown, fallback: ErrorCode = 'INTERNAL'): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) return new AppError(fallback, err.message, err);
  return new AppError(fallback, String(err), err);
}

export interface ClientError {
  code: ErrorCode;
  message: string;
  requestId: string;
  retryable: boolean;
}

/**
 * Log the real failure, return the sanitized shape the client receives.
 * This is the only path by which an error may leave the server.
 */
export function reportError(
  err: unknown,
  log: Logger,
  requestId: string,
  context: Record<string, unknown> = {}
): ClientError {
  const appError = toAppError(err);

  log.error(`${appError.code}: ${appError.detail ?? 'no detail'}`, {
    requestId,
    code: appError.code,
    ...context,
    err: appError.cause instanceof Error ? appError.cause : undefined,
  });

  return {
    code: appError.code,
    message: appError.userMessage,
    requestId,
    retryable: appError.retryable,
  };
}
