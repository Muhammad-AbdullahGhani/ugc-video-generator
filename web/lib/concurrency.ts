/**
 * Concurrency primitives: a counting semaphore and an async mutex.
 *
 * FFmpeg saturates a core per process, so unbounded parallel renders are a
 * self-inflicted denial of service. The store's read-modify-write cycle has the
 * same problem for a different reason — interleaved writes lose records.
 */

import { AppError } from './errors';

export class Semaphore {
  private available: number;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly capacity: number) {
    this.available = capacity;
  }

  get inUse(): number {
    return this.capacity - this.available;
  }

  get waiting(): number {
    return this.queue.length;
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) next();
    else this.available++;
  }

  /**
   * Run `fn` holding a slot.
   *
   * @param maxQueued reject immediately rather than queueing forever once this
   *                  many callers are already waiting.
   */
  async run<T>(fn: () => Promise<T>, maxQueued = Number.POSITIVE_INFINITY): Promise<T> {
    if (this.available === 0 && this.queue.length >= maxQueued) {
      throw new AppError('RENDER_BUSY', `queue full (${this.queue.length} waiting)`);
    }
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/** Serializes async sections. One waiter runs at a time, in arrival order. */
export class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
