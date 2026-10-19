import type { Clock } from '../services/ports/clock.js';
import { EVENT_STUCK_AFTER_MS } from '../services/ports/eventBacklog.js';
import type { EventBacklog } from '../services/ports/eventBacklog.js';

type EventStatus = 'pending' | 'processing' | 'failed';

/**
 * TEST-ONLY. An `EventBacklog` over a list of events a test fills: it counts the
 * same events as the real one (`pending`, and `processing` for less than the time
 * core allows), by the clock it is given. `setDepth` is the short way to say
 * "this many are waiting". `beforeLook` runs before each look, so that a test
 * can drain the queue while the worker waits.
 */
export class FakeEventBacklog implements EventBacklog {
  /** How many times the queue was looked at. */
  looks = 0;

  /** Runs before each look, with the number of the look (1 for the first). */
  beforeLook: ((look: number) => void) | null = null;

  private events: Array<{ status: EventStatus; startedAt: number | null }> = [];

  private failures = 0;

  constructor(private readonly clock: Pick<Clock, 'now'>) {}

  /** An event; a `processing` one began `startedAgoMs` ago. */
  add(status: EventStatus, startedAgoMs = 0): this {
    this.events.push({
      status,
      startedAt: status === 'pending' ? null : this.clock.now() - startedAgoMs
    });
    return this;
  }

  /** Exactly this many events are waiting, and nothing else is in the queue. */
  setDepth(depth: number): this {
    this.events = Array.from({ length: depth }, () => ({
      status: 'pending' as const,
      startedAt: null
    }));
    return this;
  }

  /** The next `n` looks throw, as a database that hiccups. */
  failNextLooks(n: number): this {
    this.failures = n;
    return this;
  }

  async depth(): Promise<number> {
    this.looks += 1;
    this.beforeLook?.(this.looks);
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('connection terminated');
    }
    const since = this.clock.now() - EVENT_STUCK_AFTER_MS;
    return this.events.filter(
      (event) =>
        event.status === 'pending' ||
        (event.status === 'processing' && (event.startedAt as number) > since)
    ).length;
  }
}
