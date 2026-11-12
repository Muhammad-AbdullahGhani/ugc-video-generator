import { describe, expect, it } from 'vitest';
import { consume, enforce } from '@/lib/rate-limit';
import { Mutex, Semaphore } from '@/lib/concurrency';
import { AppError } from '@/lib/errors';
import { signVideoPath, verifyVideoSignature } from '@/lib/signed-url';

describe('rate limiting', () => {
  it('allows up to the limit then refuses', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(consume(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = consume(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps separate budgets per key', () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    expect(consume(a, 1, 60_000).allowed).toBe(true);
    expect(consume(a, 1, 60_000).allowed).toBe(false);
    expect(consume(b, 1, 60_000).allowed).toBe(true);
  });

  it('refills over time', async () => {
    const key = `test-refill-${Math.random()}`;
    expect(consume(key, 1, 50).allowed).toBe(true);
    expect(consume(key, 1, 50).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(consume(key, 1, 50).allowed).toBe(true);
  });

  it('throws RATE_LIMITED from enforce', () => {
    const key = `test-enforce-${Math.random()}`;
    enforce(key, 1, 60_000);
    try {
      enforce(key, 1, 60_000);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('RATE_LIMITED');
      expect((err as AppError).status).toBe(429);
    }
  });
});

describe('Semaphore', () => {
  it('never runs more than its capacity at once', async () => {
    const semaphore = new Semaphore(2);
    let active = 0;
    let peak = 0;

    await Promise.all(
      Array.from({ length: 8 }, () =>
        semaphore.run(async () => {
          active++;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
        })
      )
    );

    expect(peak).toBeLessThanOrEqual(2);
    expect(active).toBe(0);
  });

  it('releases its slot when the task throws', async () => {
    const semaphore = new Semaphore(1);
    await expect(
      semaphore.run(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    await expect(semaphore.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('rejects with RENDER_BUSY once the queue is full', async () => {
    const semaphore = new Semaphore(1);
    const held = semaphore.run(() => new Promise((resolve) => setTimeout(resolve, 30)));
    const queued = semaphore.run(async () => 'queued', 1);

    await expect(semaphore.run(async () => 'rejected', 1)).rejects.toMatchObject({
      code: 'RENDER_BUSY',
    });

    await held;
    await queued;
  });
});

describe('Mutex', () => {
  it('serializes read-modify-write sections', async () => {
    const mutex = new Mutex();
    let shared = 0;

    // Without the mutex the interleaved read and write lose increments —
    // exactly how the JSON store used to drop concurrent saves.
    await Promise.all(
      Array.from({ length: 20 }, () =>
        mutex.run(async () => {
          const current = shared;
          await new Promise((resolve) => setTimeout(resolve, 1));
          shared = current + 1;
        })
      )
    );

    expect(shared).toBe(20);
  });
});

describe('signed video URLs', () => {
  it('round-trips a signature', () => {
    const filename = 'ugc_1731340000000_a1b2c.mp4';
    const url = signVideoPath(filename);
    const params = new URL(url, 'http://localhost').searchParams;
    expect(verifyVideoSignature(filename, params.get('exp'), params.get('sig'))).toBe(true);
  });

  it('rejects a signature bound to a different file', () => {
    const url = signVideoPath('ugc_1731340000000_a1b2c.mp4');
    const params = new URL(url, 'http://localhost').searchParams;
    expect(
      verifyVideoSignature('ugc_9999999999999_zzzzz.mp4', params.get('exp'), params.get('sig'))
    ).toBe(false);
  });

  it('rejects a tampered expiry, a missing signature and an expired link', () => {
    const filename = 'ugc_1731340000000_a1b2c.mp4';
    const params = new URL(signVideoPath(filename), 'http://localhost').searchParams;

    expect(verifyVideoSignature(filename, '99999999999999', params.get('sig'))).toBe(false);
    expect(verifyVideoSignature(filename, params.get('exp'), null)).toBe(false);
    expect(verifyVideoSignature(filename, null, params.get('sig'))).toBe(false);

    const expired = new URL(signVideoPath(filename, -1_000), 'http://localhost').searchParams;
    expect(verifyVideoSignature(filename, expired.get('exp'), expired.get('sig'))).toBe(false);
  });
});
