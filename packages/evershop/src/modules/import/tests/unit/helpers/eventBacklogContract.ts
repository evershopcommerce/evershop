import { describe, it, expect, beforeEach } from '@jest/globals';
import type { EventBacklog } from '../../../services/ports/eventBacklog.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { FakeEventBacklog } from '../../../testing/FakeEventBacklog.js';

type EventStatus = 'pending' | 'processing' | 'failed';

/** What the contract needs to put events in the queue; each implementation brings one. */
export interface EventBacklogHarness {
  backlog: EventBacklog;
  /** An event of any name; a `processing` one began `startedAgoMs` ago. */
  add(status: EventStatus, startedAgoMs?: number, name?: string): Promise<void>;
}

const MINUTE = 60_000;

/** The fake queue, as a harness for the contract. */
export function fakeEventHarness(): EventBacklogHarness {
  const backlog = new FakeEventBacklog(new FakeClock());
  return {
    backlog,
    async add(status, startedAgoMs = 0) {
      backlog.add(status, startedAgoMs);
    }
  };
}

/**
 * What every `EventBacklog` must count (§ 8.5): the events that wait for the
 * event process. Core marks an event `processing` for more than five minutes as
 * lost, so such an event is not waiting for anyone. It runs against the fake
 * and against PostgreSQL.
 */
export function eventBacklogContract(
  label: string,
  make: () => Promise<EventBacklogHarness>
): void {
  describe(`${label}: the contract of an EventBacklog`, () => {
    let h: EventBacklogHarness;

    beforeEach(async () => {
      h = await make();
    });

    it('is zero for an empty queue', async () => {
      expect(await h.backlog.depth()).toBe(0);
    });

    it('counts the events that are pending, whatever their name', async () => {
      await h.add('pending', 0, 'category_created');
      await h.add('pending', 0, 'order_placed');
      await h.add('pending', 0, 'import_job_requested');
      expect(await h.backlog.depth()).toBe(3);
    });

    it('counts an event that has been processing for less than five minutes', async () => {
      await h.add('processing', 0);
      await h.add('processing', 1 * MINUTE);
      await h.add('processing', 4.5 * MINUTE);
      expect(await h.backlog.depth()).toBe(3);
    });

    it('does not count an event that has been processing for more than five minutes: its event process is dead', async () => {
      await h.add('processing', 5.5 * MINUTE);
      await h.add('processing', 30 * MINUTE);
      expect(await h.backlog.depth()).toBe(0);
    });

    it('does not count an event that failed', async () => {
      await h.add('failed', 1 * MINUTE);
      await h.add('failed', 10 * MINUTE);
      expect(await h.backlog.depth()).toBe(0);
    });

    it('adds up the pending and the processing, and nothing else', async () => {
      await h.add('pending');
      await h.add('pending');
      await h.add('processing', 2 * MINUTE);
      await h.add('processing', 8 * MINUTE);
      await h.add('failed');
      expect(await h.backlog.depth()).toBe(3);
    });

    it('reads the queue as it is at each call', async () => {
      expect(await h.backlog.depth()).toBe(0);
      await h.add('pending');
      expect(await h.backlog.depth()).toBe(1);
      await h.add('pending');
      expect(await h.backlog.depth()).toBe(2);
    });

    it('gives a number, also for a long queue', async () => {
      for (let n = 0; n < 40; n += 1) {
        // eslint-disable-next-line no-await-in-loop
        await h.add('pending');
      }
      const depth = await h.backlog.depth();
      expect(typeof depth).toBe('number');
      expect(depth).toBe(40);
    });
  });
}
