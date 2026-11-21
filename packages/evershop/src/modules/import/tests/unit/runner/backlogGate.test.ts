import { describe, it, expect } from '@jest/globals';
import {
  BACKLOG_SAMPLE_MS,
  BacklogGate
} from '../../../services/runner/backlogGate.js';
import type { BacklogLimits } from '../../../services/runner/backlogGate.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { FakeEventBacklog } from '../../../testing/FakeEventBacklog.js';

/**
 * The gate in front of each row (§ 8.5), on its own: a fake clock that moves
 * when the gate sleeps, and a queue whose length the test scripts.
 */
function setup(
  options: {
    limits?: Partial<BacklogLimits>;
    setWaiting?: (waiting: boolean) => Promise<boolean>;
  } = {}
) {
  const clock = new FakeClock();
  const backlog = new FakeEventBacklog(clock);
  const logger = new CollectingLogger();
  const controller = new AbortController();
  const marks: boolean[] = [];
  const gate = new BacklogGate({
    backlog,
    clock,
    logger,
    limits: { high: 500, low: 100, maxWaitMs: 60_000, ...options.limits },
    signal: controller.signal,
    jobId: 7,
    setWaiting: async (waiting) => {
      marks.push(waiting);
      return options.setWaiting ? options.setWaiting(waiting) : true;
    }
  });
  return { gate, clock, backlog, logger, controller, marks };
}

describe('BacklogGate: a short queue', () => {
  it('lets the row go at once, without a pause and without telling the job', async () => {
    const t = setup();
    t.backlog.setDepth(10);
    expect(await t.gate.pass()).toBe('go');
    expect(t.marks).toEqual([]);
    expect(t.clock.sleeps).toEqual([]);
    expect(t.logger.lines).toEqual([]);
  });

  it('looks at the queue before the first row', async () => {
    const t = setup();
    await t.gate.pass();
    expect(t.backlog.looks).toBe(1);
  });

  it('pauses above the high mark and not at it', async () => {
    const at = setup();
    at.backlog.setDepth(500);
    expect(await at.gate.pass()).toBe('go');
    expect(at.marks).toEqual([]);

    const above = setup();
    above.backlog.setDepth(501);
    above.backlog.beforeLook = (look) => {
      if (look === 2) above.backlog.setDepth(0);
    };
    expect(await above.gate.pass()).toBe('go');
    expect(above.marks).toEqual([true, false]);
  });

  it('does not pause for a queue between the marks when it is calm', async () => {
    const t = setup();
    t.backlog.setDepth(300);
    expect(await t.gate.pass()).toBe('go');
    expect(t.marks).toEqual([]);
  });

  it('looks at the queue once a second at most, not before every row', async () => {
    const t = setup();
    for (let row = 0; row < 50; row += 1) {
      // eslint-disable-next-line no-await-in-loop
      await t.gate.pass();
    }
    expect(t.backlog.looks).toBe(1);
    await t.clock.advance(BACKLOG_SAMPLE_MS - 1);
    await t.gate.pass();
    expect(t.backlog.looks).toBe(1);
    await t.clock.advance(1);
    await t.gate.pass();
    expect(t.backlog.looks).toBe(2);
    expect(BACKLOG_SAMPLE_MS).toBe(1000);
  });

  it('does not stop a calm run on a look that fails, and looks again a second later', async () => {
    const t = setup();
    t.backlog.setDepth(900).failNextLooks(1);
    expect(await t.gate.pass()).toBe('go');
    expect(t.marks).toEqual([]);
    expect(t.logger.of('warn')).toEqual([
      {
        level: 'warn',
        message: 'The event queue could not be measured',
        meta: { job: 7, error: 'connection terminated' }
      }
    ]);
    // The failed look counts as a look: the next one is a second later, not at once.
    await t.gate.pass();
    expect(t.backlog.looks).toBe(1);
    await t.clock.advance(BACKLOG_SAMPLE_MS);
    t.backlog.beforeLook = (look) => {
      if (look === 3) t.backlog.setDepth(0);
    };
    expect(await t.gate.pass()).toBe('go');
    expect(t.backlog.looks).toBe(3);
    expect(t.marks).toEqual([true, false]);
  });
});

describe('BacklogGate: a long queue', () => {
  it('marks the job as waiting, looks every second, and goes on when the queue is below the low mark', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 4) t.backlog.setDepth(99);
    };
    expect(await t.gate.pass()).toBe('go');
    expect(t.marks).toEqual([true, false]);
    expect(t.clock.sleeps).toEqual([1000, 1000, 1000]);
    expect(t.backlog.looks).toBe(4);
  });

  it('marks the job as waiting before it waits, and as not waiting before the row', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    const order: string[] = [];
    t.backlog.beforeLook = (look) => {
      order.push(`look ${look}`);
      if (look === 2) t.backlog.setDepth(0);
    };
    const gate = new BacklogGate({
      backlog: t.backlog,
      clock: t.clock,
      logger: t.logger,
      limits: { high: 500, low: 100, maxWaitMs: 60_000 },
      signal: t.controller.signal,
      jobId: 7,
      setWaiting: async (waiting) => {
        order.push(waiting ? 'waiting' : 'not waiting');
        return true;
      }
    });
    expect(await gate.pass()).toBe('go');
    expect(order).toEqual(['look 1', 'waiting', 'look 2', 'not waiting']);
  });

  it('goes on below the low mark and not at it', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 2) t.backlog.setDepth(100);
      if (look === 3) t.backlog.setDepth(99);
    };
    expect(await t.gate.pass()).toBe('go');
    expect(t.backlog.looks).toBe(3);
  });

  it('keeps waiting while the queue is between the marks: it does not go on at the high mark', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look >= 2) t.backlog.setDepth(300);
      if (look === 6) t.backlog.setDepth(10);
    };
    expect(await t.gate.pass()).toBe('go');
    expect(t.backlog.looks).toBe(6);
  });

  it('writes down that it waits and that it goes on', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 3) t.backlog.setDepth(20);
    };
    await t.gate.pass();
    expect(t.logger.of('info')).toEqual([
      {
        level: 'info',
        message: 'The import is waiting for the event queue to drain',
        meta: { job: 7, waiting: 900, above: 500 }
      },
      {
        level: 'info',
        message: 'The event queue has drained: the import goes on',
        meta: { job: 7, waiting: 20, waitedMs: 2000 }
      }
    ]);
  });

  it('is calm again after a wait: the next row does not look at once', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 2) t.backlog.setDepth(0);
    };
    await t.gate.pass();
    const looks = t.backlog.looks;
    expect(await t.gate.pass()).toBe('go');
    expect(t.backlog.looks).toBe(looks);
  });

  it('waits again when the queue fills up again', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 2) t.backlog.setDepth(0);
    };
    await t.gate.pass();
    await t.clock.advance(BACKLOG_SAMPLE_MS);
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 4) t.backlog.setDepth(0);
    };
    expect(await t.gate.pass()).toBe('go');
    expect(t.marks).toEqual([true, false, true, false]);
  });
});

describe('BacklogGate: a queue that does not drain', () => {
  it('gives up when the wait has lasted as long as it may, and leaves the mark for the end of the run', async () => {
    const t = setup({ limits: { maxWaitMs: 5000 } });
    t.backlog.setDepth(900);
    expect(await t.gate.pass()).toBe('gave_up');
    // The time is up at the fifth look after the first, not the sixth.
    expect(t.clock.sleeps).toEqual([1000, 1000, 1000, 1000, 1000]);
    expect(t.marks).toEqual([true]);
    expect(t.logger.of('warn')).toEqual([
      {
        level: 'warn',
        message: 'The event queue did not drain: the import gives up',
        meta: { job: 7, waiting: 900, waitedMs: 5000 }
      }
    ]);
  });

  it('goes on when the queue drains at the very moment the time is up', async () => {
    const t = setup({ limits: { maxWaitMs: 3000 } });
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 4) t.backlog.setDepth(0);
    };
    expect(await t.gate.pass()).toBe('go');
    expect(t.marks).toEqual([true, false]);
  });

  it('times the wait from the moment it began, not from the start of the run', async () => {
    const t = setup({ limits: { maxWaitMs: 2000 } });
    await t.clock.advance(3_600_000);
    t.backlog.setDepth(900);
    expect(await t.gate.pass()).toBe('gave_up');
    expect(t.clock.sleeps).toEqual([1000, 1000]);
  });

  it('counts a look that fails as a queue that has not drained', async () => {
    const t = setup({ limits: { maxWaitMs: 3000 } });
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      // The queue is empty from the second look on, but nobody can see it.
      if (look === 2) t.backlog.setDepth(0).failNextLooks(100);
    };
    expect(await t.gate.pass()).toBe('gave_up');
    expect(
      t.logger.of('warn').filter((l) => /measured/.test(l.message))
    ).toHaveLength(3);
  });

  it('goes on waiting after a look that fails, and goes on when a later look sees the drain', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 2) t.backlog.setDepth(0).failNextLooks(1);
    };
    expect(await t.gate.pass()).toBe('go');
    // Look 2 failed; look 3 saw the empty queue.
    expect(t.backlog.looks).toBe(3);
  });
});

describe('BacklogGate: a run that has to stop', () => {
  it('says stopped at once when the run was stopped, without a look', async () => {
    const t = setup();
    t.controller.abort();
    expect(await t.gate.pass()).toBe('stopped');
    expect(t.backlog.looks).toBe(0);
  });

  it('stops a wait at the next look when the run is stopped, and does not mark the job as not waiting', async () => {
    const t = setup();
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 2) t.controller.abort();
    };
    expect(await t.gate.pass()).toBe('stopped');
    expect(t.marks).toEqual([true]);
    // The stop came during the second look; it is seen after the sleep that follows.
    expect(t.clock.sleeps).toEqual([1000, 1000]);
  });

  it('stops when the job is no longer ours at the moment the wait begins', async () => {
    const t = setup({ setWaiting: async () => false });
    t.backlog.setDepth(900);
    expect(await t.gate.pass()).toBe('stopped');
    expect(t.clock.sleeps).toEqual([]);
  });

  it('stops when the job is no longer ours at the moment the wait ends', async () => {
    const t = setup({ setWaiting: async (waiting) => waiting });
    t.backlog.setDepth(900);
    t.backlog.beforeLook = (look) => {
      if (look === 2) t.backlog.setDepth(0);
    };
    expect(await t.gate.pass()).toBe('stopped');
  });
});
