import { describe, it, expect } from '@jest/globals';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { runImport, runValidation } from '../../../services/runner/index.js';
import { Session } from '../../../services/runner/session.js';
import { harness } from '../helpers/harness.js';
import type { Harness } from '../helpers/harness.js';

/**
 * The import and the event queue (§ 8.5, J5): the runner asks the queue before
 * each row, waits while it is long, and gives up when it does not drain. The
 * tests use a store whose queue grows by one event for each row written, and
 * an event process that the test starts when it wants.
 */
const named = (url_key: string) =>
  categoryRow({ url_key, name: url_key.toUpperCase() });

const keys = (n: number) =>
  Array.from({ length: n }, (_, i) => `k${String(i).padStart(2, '0')}`);

const FILE = categoryFile(...keys(12).map(named));

const queued = { status: 'queued' as const };

/** Pause above 5 events, go on below 2, give up after 2 minutes. */
const LIMITS = {
  eventBacklogHigh: 5,
  eventBacklogLow: 2,
  eventBacklogMaxWaitMs: 120_000
};

/**
 * Each row takes `rowMs` of the fake clock, and writes one event that stays in
 * the queue until `drain()` (the event process catches up). The queue is
 * measured when the runner looks at it.
 */
function eventfulStore(h: Harness, rowMs = 400) {
  const inner = h.deps.services;
  h.deps.services = {
    createProduct: (input) => inner.createProduct(input),
    updateProduct: (uuid, input) => inner.updateProduct(uuid, input),
    createVariantGroup: (input) => inner.createVariantGroup(input),
    addVariantItem: (group, product) => inner.addVariantItem(group, product),
    recordRedirects: (uuid, paths) => inner.recordRedirects(uuid, paths),
    createCustomer: (input) => inner.createCustomer(input),
    createCustomerAddress: (uuid, input) =>
      inner.createCustomerAddress(uuid, input),
    updateCustomer: (uuid, input) => inner.updateCustomer(uuid, input),
    setCustomerMetafields: (id, values) =>
      inner.setCustomerMetafields(id, values),
    async createCategory(input) {
      await h.clock.advance(rowMs);
      return inner.createCategory(input);
    },
    async updateCategory(uuid, input) {
      await h.clock.advance(rowMs);
      return inner.updateCategory(uuid, input);
    }
  };
  let drained = 0;
  const store = {
    /** What the runner saw at each look: the time, the rows written, the mark on the job. */
    looks: [] as Array<{
      at: number;
      rows: number;
      waitingSince: number | null;
      sleeps: number;
    }>,
    /** A step that runs at each look, before the queue is measured. */
    onLook: null as null | ((look: number) => void),
    drain() {
      drained = h.services.calls.length;
    },
    /** The event process has taken all but `left` of the events. */
    drainTo(left: number) {
      drained = h.services.calls.length - left;
    }
  };
  h.backlog.beforeLook = (look) => {
    store.looks.push({
      at: h.clock.now(),
      rows: h.services.calls.length,
      waitingSince: h.jobs.snapshot(1).waitingSince,
      sleeps: h.clock.sleeps.length
    });
    store.onLook?.(look);
    h.backlog.setDepth(h.services.calls.length - drained);
  };
  return store;
}

describe('runImport: an event process that keeps up', () => {
  it('writes every row without waiting, and looks at the queue once a second and not for each row', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    // The event process takes each event as it comes.
    store.onLook = () => store.drain();
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts.created).toBe(12);
    expect(h.clock.sleeps).toEqual([]);
    // 12 rows of 0.4 s: a look before the first row, then every 1.2 s.
    expect(h.backlog.looks).toBe(5);
    expect(h.jobs.snapshot(1).waitingSince).toBeNull();
  });
});

describe('runImport: an event process that falls behind', () => {
  it('stops writing while the queue is long, shows that it waits, and goes on when the queue has drained', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    // The event process starts again after the import has waited three seconds.
    store.onLook = () => {
      if (h.clock.sleeps.length >= 3) store.drain();
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.clock.sleeps).toEqual([1000, 1000, 1000]);
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      created: 12,
      failed: 0
    });
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(keys(12));

    // The looks that were made while it waited: no row was written between
    // them, and the job showed since when it waited, the same time each time.
    const waiting = store.looks.filter((look) => look.waitingSince !== null);
    expect(waiting.map((look) => look.rows)).toEqual([6, 6, 6]);
    const began = store.looks.find(
      (look) => look.sleeps === 0 && look.rows === 6
    )?.at;
    expect(began).toBeDefined();
    expect(waiting.map((look) => look.waitingSince)).toEqual([
      began,
      began,
      began
    ]);
    // It does not show before it waits or after.
    expect(
      store.looks.filter((look) => look.waitingSince === null).length
    ).toBe(store.looks.length - 3);
    expect(h.jobs.snapshot(1).waitingSince).toBeNull();
  });

  it('keeps waiting while the queue is between the two marks, and goes on only below the low one', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    store.onLook = () => {
      // Three events are left: below the high mark (5) but not below the low one (2).
      if (h.clock.sleeps.length >= 2) store.drainTo(3);
      if (h.clock.sleeps.length >= 5) store.drainTo(1);
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.clock.sleeps).toHaveLength(5);
  });

  it('keeps the heartbeat going while it waits, so that recovery does not take it for dead', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    store.onLook = () => {
      if (h.clock.sleeps.length >= 10) store.drain();
    };
    const checkpointsAtLook: number[] = [];
    const heartbeats: Array<number | null> = [];
    const before = h.backlog.beforeLook;
    h.backlog.beforeLook = (look) => {
      checkpointsAtLook.push(h.jobs.checkpoints);
      heartbeats.push(h.jobs.snapshot(1).heartbeatAt);
      before?.(look);
    };
    await runImport(1, h.deps);
    const last = store.looks.length - 1;
    // Ten seconds of waiting: five ticks of two seconds.
    expect(checkpointsAtLook[last]).toBeGreaterThanOrEqual(
      checkpointsAtLook[last - 10] + 5
    );
    expect(
      store.looks[last].at - (heartbeats[last] as number)
    ).toBeLessThanOrEqual(2000);
  });

  it('gives up when the queue does not drain, ends interrupted with the reason, and keeps what it wrote', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    eventfulStore(h);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('interrupted');
    expect(h.clock.sleeps).toHaveLength(120);
    const job = h.jobs.snapshot(1);
    expect(job).toMatchObject({
      status: 'interrupted',
      errorMessage:
        'The event process is not draining: more than 5 events were waiting for 2 minutes. Find out why events are not processed, then resume the import.',
      waitingSince: null,
      stage: null,
      finishedAt: null,
      counts: { created: 6, lastUnit: 6 }
    });
    expect(job.startedAt).not.toBeNull();
    expect(job.expiresAt).not.toBeNull();
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(
      keys(12).slice(0, 6)
    );
    expect(h.clock.running).toBe(0);
  });

  it('writes the other rows, once, when the job is resumed after the queue has drained', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    expect((await runImport(1, h.deps)).outcome).toBe('interrupted');
    store.drain();
    h.services.calls.length = 0;
    h.jobs.setStatus(1, 'queued');
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(
      keys(12).slice(6)
    );
    expect(h.lookup.stored.size).toBe(12);
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'completed',
      errorMessage: null,
      waitingSince: null,
      counts: { created: 12, failed: 0 }
    });
  });

  it('gives up with the same reason at the time the settings say', async () => {
    const h = harness({
      config: { ...LIMITS, eventBacklogMaxWaitMs: 90_000 }
    });
    h.stage(FILE, queued);
    eventfulStore(h);
    await runImport(1, h.deps);
    expect(h.clock.sleeps).toHaveLength(90);
    expect(h.jobs.snapshot(1).errorMessage).toContain('for 1.5 minutes');
  });
});

describe('runImport: giving up before the first row', () => {
  it('changes nothing about the job: no started_at, so a resume checks the file again', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    // The queue is long before the import begins.
    h.backlog.setDepth(1000);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('interrupted');
    expect(h.services.calls).toEqual([]);
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'interrupted',
      startedAt: null,
      waitingSince: null,
      counts: { created: 0, lastUnit: 0 }
    });
    expect(h.jobs.snapshot(1).errorMessage).toContain('not draining');
  });

  it('keeps the problems of a resumed job, which say what the next run has to write again', async () => {
    const h = harness({ config: LIMITS });
    h.stage(categoryFile(...keys(3).map(named)), queued);
    h.services.failOn(
      (call) => call.input.url_key === 'k01',
      new Error('boom'),
      1
    );
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ failed: 1, created: 2 });
    const problems = h.jobs.issues(1, 'import');
    expect(problems).toHaveLength(1);

    // Resumed, with a queue that does not drain: nothing is written, nothing is lost.
    h.backlog.setDepth(1000);
    h.jobs.setStatus(1, 'queued');
    h.services.calls.length = 0;
    expect((await runImport(1, h.deps)).outcome).toBe('interrupted');
    expect(h.services.calls).toEqual([]);
    expect(h.jobs.issues(1, 'import')).toEqual(problems);
    expect(h.jobs.snapshot(1).counts).toMatchObject({ failed: 1, created: 2 });

    // The queue has drained: the failed row is written again.
    h.backlog.setDepth(0);
    h.jobs.setStatus(1, 'queued');
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(['k01']);
    expect(h.jobs.snapshot(1).counts).toMatchObject({ failed: 0, created: 3 });
  });
});

describe('runImport: a wait that is cut short', () => {
  it('ends canceled when the admin cancels during the wait', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    store.onLook = () => {
      if (h.clock.sleeps.length === 1) h.jobs.setControl(1, 'cancel');
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('canceled');
    expect(h.clock.sleeps.length).toBeLessThan(10);
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'canceled',
      control: null,
      waitingSince: null,
      errorMessage: null
    });
    expect(h.services.calls).toHaveLength(6);
  });

  it('ends interrupted, as stopped and not as not draining, when the process is told to stop (SIGTERM)', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    const controller = new AbortController();
    store.onLook = () => {
      if (h.clock.sleeps.length === 2) controller.abort();
    };
    const result = await runImport(1, h.deps, { signal: controller.signal });
    expect(result.outcome).toBe('interrupted');
    expect(h.clock.sleeps).toHaveLength(3);
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'interrupted',
      errorMessage: 'The worker was stopped before it finished.',
      waitingSince: null
    });
    expect(h.services.calls).toHaveLength(6);
  });

  it('stops without a write when the job is no longer ours', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    store.onLook = () => {
      if (h.clock.sleeps.length === 1) h.jobs.bumpAttempt(1);
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('lost');
    expect(h.services.calls).toHaveLength(6);
    // Another worker owns the job now: its status is not touched.
    expect(h.jobs.snapshot(1).status).toBe('running');
  });

  it('stops when the job is no longer ours at the moment the wait begins', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    eventfulStore(h);
    const original = h.jobs.setWaiting.bind(h.jobs);
    h.jobs.setWaiting = async (id, attempt, waiting) => {
      h.jobs.bumpAttempt(id);
      return original(id, attempt, waiting);
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('lost');
    expect(h.clock.sleeps).toEqual([]);
    expect(h.services.calls).toHaveLength(6);
  });
});

describe('runImport: when the queue cannot be read or the mark cannot be written', () => {
  it('does not stop the import for a look that fails', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    h.backlog.failNextLooks(1);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.logger.of('warn').map((l) => l.message)).toEqual([
      'The event queue could not be measured'
    ]);
  });

  it('waits all the same when the mark on the job cannot be written, and says so', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const store = eventfulStore(h);
    store.onLook = () => {
      if (h.clock.sleeps.length >= 2) store.drain();
    };
    h.jobs.setWaiting = async () => {
      throw new Error('connection terminated');
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.clock.sleeps).toEqual([1000, 1000]);
    expect(
      h.logger.of('warn').filter((l) => /waiting state/.test(l.message))
    ).toHaveLength(2);
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(keys(12));
  });
});

describe('runValidation: the check writes no events', () => {
  it('does not look at the queue, however long it is', async () => {
    const h = harness({ config: LIMITS });
    h.stage(FILE);
    h.backlog.setDepth(100_000);
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.backlog.looks).toBe(0);
  });
});

describe('Session.setWaiting: the mark on the job, for a run', () => {
  async function session() {
    const h = harness({ config: LIMITS });
    h.stage(FILE, queued);
    const attempt = (await h.jobs.claim(1, 'queued', 'running', 'w')) as number;
    const job = (await h.jobs.get(1))!;
    return { h, session: new Session(h.deps, job, attempt, job.counts) };
  }

  it('writes the mark and clears it, and leaves the run going', async () => {
    const { h, session: s } = await session();
    expect(await s.setWaiting(true)).toBe(true);
    expect(h.jobs.snapshot(1).waitingSince).toBe(h.clock.now());
    expect(await s.setWaiting(false)).toBe(true);
    expect(h.jobs.snapshot(1).waitingSince).toBeNull();
    expect(s.control.reason).toBeNull();
  });

  it('tells the run to stop, as lost, when the job is no longer ours', async () => {
    const { h, session: s } = await session();
    h.jobs.bumpAttempt(1);
    expect(await s.setWaiting(true)).toBe(false);
    expect(s.control.reason).toBe('lost');
    expect(s.control.signal.aborted).toBe(true);
  });
});
