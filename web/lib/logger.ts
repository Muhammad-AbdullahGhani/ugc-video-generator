/**
 * Structured logging with request correlation.
 *
 * Every log line is a single JSON object in production (greppable, ingestible)
 * and a readable line in development. Each request gets an id that appears both
 * in the logs and in the error payload the user sees, so a support report of
 * "it failed, request e3f9a1c2" is enough to find the stack trace.
 */

import { randomUUID } from 'crypto';
import { env } from './env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: LogLevel = env.isProduction ? 'info' : 'debug';

export type LogFields = Record<string, unknown>;

/** Keys whose values are redacted wherever they appear in log fields. */
const SENSITIVE_KEY = /(secret|token|password|api[-_]?key|authorization|cookie)/i;

function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '[redacted]';
    } else if (value instanceof Error) {
      out[key] = { name: value.name, message: value.message, stack: value.stack };
    } else {
      out[key] = value;
    }
  }
  return out;
}

function emit(level: LogLevel, scope: string, message: string, fields: LogFields = {}): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const payload = { level, scope, message, time: new Date().toISOString(), ...redact(fields) };
  const line = env.isProduction
    ? JSON.stringify(payload)
    : `[${scope}] ${message}${Object.keys(fields).length ? ` ${JSON.stringify(redact(fields))}` : ''}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(scope: string, fields?: LogFields): Logger;
}

export function createLogger(scope: string, base: LogFields = {}): Logger {
  return {
    debug: (message, fields) => emit('debug', scope, message, { ...base, ...fields }),
    info: (message, fields) => emit('info', scope, message, { ...base, ...fields }),
    warn: (message, fields) => emit('warn', scope, message, { ...base, ...fields }),
    error: (message, fields) => emit('error', scope, message, { ...base, ...fields }),
    child: (childScope, fields) => createLogger(`${scope}:${childScope}`, { ...base, ...fields }),
  };
}

export const logger = createLogger('app');

/** Short, human-quotable correlation id. */
export function newRequestId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}
