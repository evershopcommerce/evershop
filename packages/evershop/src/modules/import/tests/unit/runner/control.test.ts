import { describe, it, expect } from '@jest/globals';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { emptyCounts } from '../../../services/job/types.js';
import { runValidation } from '../../../services/runner/index.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { harness } from '../helpers/harness.js';
import type { Harness } from '../helpers/harness.js';

/**
 * What the heartbeat and the stops do (§ 8.4), shown on the check: the check
 * waits for the store, and the test lets the time pass in that wait.
 */
const named = (url_key: string, more = {}) =>
  categoryRow({ url_key, name: url_key.toUpperCase(), ...more });

const BAD_STATUS = categoryFile(named('a', { status: '9' }), named('b'));

/** A store whose answer takes a while, and lets a test act while the worker waits. */
function slowStore(h: Harness, during: () => void | Promise<void>, ms = 2500) {
  class Slow extends MemoryLookup {
    async categories(keys: readonly string[]) {
      await during();
      await h.clock.advance(ms);
      return super.categories(keys);
    }
  }
  h.deps.lookup = new Slow();
}

describe('the heartbeat (§ 8.4)', () => {
  it('writes the counts and the problems on a timer, while the worker is busy', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    let seen: {
      checkpoints: number;
      issues: number;
      heartbeat: number | null;
    } | null = null;
    class Spy extends MemoryLookup {
      async categories(keys: readonly string[]) {
        await h.clock.advance(2500);
        seen = {
          checkpoints: h.jobs.checkpoints,
          issues: h.jobs.issues(1).length,
          heartbeat: h.jobs.snapshot(1).heartbeatAt
        };
        return super.categories(keys);
      }
    }
    const started = h.clock.now();
    h.deps.lookup = new Spy();
    await runValidation(1, h.deps);
    // One tick, 2 s after the start, with the problem the first pass had found:
    // it was in the job before the check was over.
    expect(seen).toEqual({
      checkpoints: 1,
      issues: 1,
      heartbeat: started + 2000
    });
    expect(h.jobs.snapshot(1).counts.errors).toBe(1);
  });

  it('writes again every two seconds', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    slowStore(h, () => undefined, 9000);
    await runValidation(1, h.deps);
    // Four ticks in 9 s, and the last write when the run ends.
    expect(h.jobs.checkpoints).toBe(5);
  });

  it('does not lose or repeat a problem when a write fails: the next tick writes it', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    h.jobs.failNextCheckpoints(1);
    slowStore(h, () => undefined, 4500);
    await runValidation(1, h.deps);
    expect(h.jobs.issues(1).map((i) => i.code)).toEqual(['INVALID_VALUE']);
    expect(h.logger.of('warn').map((l) => l.message)).toEqual([
      'The heartbeat could not be written'
    ]);
    expect(h.jobs.snapshot(1).status).toBe('validated');
  });

  it('stops the timer when the run ends, however it ends', async () => {
    for (const how of ['ok', 'fail'] as const) {
      const h = harness();
      h.stage(how === 'ok' ? BAD_STATUS : 'a');
      if (how === 'fail') h.files.damage(1, 'flip-byte');
      await runValidation(1, h.deps);
      expect(h.clock.running).toBe(0);
    }
  });
});

describe('cancel, SIGTERM and a job that is no longer ours', () => {
  it('ends canceled when the admin cancels: the next heartbeat reads the control', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    slowStore(h, () => h.jobs.setControl(1, 'cancel'), 2500);
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('canceled');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'canceled',
      control: null,
      errorMessage: null
    });
    expect(h.jobs.snapshot(1).finishedAt).not.toBeNull();
  });

  it('ends interrupted when the process is told to stop (SIGTERM)', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    const controller = new AbortController();
    slowStore(h, () => controller.abort(), 100);
    const result = await runValidation(1, h.deps, {
      signal: controller.signal
    });
    expect(result.outcome).toBe('interrupted');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'interrupted',
      errorMessage: 'The worker was stopped before it finished.'
    });
  });

  it('is interrupted at once when the signal was already aborted', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    const controller = new AbortController();
    controller.abort();
    const result = await runValidation(1, h.deps, {
      signal: controller.signal
    });
    expect(result.outcome).toBe('interrupted');
  });

  it('stops quietly when the job is deleted: not one more write', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    slowStore(h, () => h.jobs.delete(1), 2500);
    const result = await runValidation(1, h.deps);
    expect(result).toEqual({ outcome: 'lost' });
    expect(() => h.jobs.snapshot(1)).toThrow('No job 1');
    expect(h.logger.of('error')).toEqual([]);
    expect(h.clock.running).toBe(0);
  });

  it('stops quietly when the job was claimed again (a stale attempt): the new owner is not disturbed', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    slowStore(h, () => h.jobs.bumpAttempt(1), 2500);
    const before = h.jobs.checkpoints;
    const result = await runValidation(1, h.deps);
    expect(result).toEqual({ outcome: 'lost' });
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validating',
      attempt: 2
    });
    expect(h.jobs.checkpoints).toBe(before);
    expect(h.jobs.issues(1)).toEqual([]);
  });

  it('stops quietly when the job was canceled by the recovery job (it is no longer validating)', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    slowStore(h, () => h.jobs.setStatus(1, 'interrupted'), 2500);
    const result = await runValidation(1, h.deps);
    expect(result).toEqual({ outcome: 'lost' });
    expect(h.jobs.snapshot(1).status).toBe('interrupted');
  });
});

describe('the heartbeat, in more detail', () => {
  const THREE_BAD = categoryFile(
    named('a', { status: '7' }),
    named('b', { status: '8' }),
    named('c', { status: '9' })
  );

  it('keeps the problems in the order of the rows when a write has to be tried again', async () => {
    const h = harness();
    h.stage(THREE_BAD);
    h.jobs.failNextCheckpoints(1);
    slowStore(h, () => undefined, 4500);
    await runValidation(1, h.deps);
    expect(h.jobs.issues(1).map((issue) => issue.rowNumber)).toEqual([2, 3, 4]);
  });

  it('keeps the order of the problems across two writes that fail, with new ones coming in between', async () => {
    const h = harness();
    // Rows 2 and 4 are found by the first pass, row 3 by the second.
    h.stage(
      categoryFile(
        named('a', { status: '7' }),
        named('b', { parent: 'ghost' }),
        named('c', { status: '9' })
      )
    );
    h.jobs.failNextCheckpoints(2);
    slowStore(h, () => undefined, 4500);
    await runValidation(1, h.deps);
    expect(h.jobs.issues(1).map((issue) => issue.rowNumber)).toEqual([2, 4, 3]);
  });

  it('puts the problems that a failed write gives back before the ones that came while it was under way', async () => {
    const h = harness();
    // The first pass finds rows 2 and 4. The tick takes them, and the write is
    // slow; the second pass finds row 3 meanwhile; then the write fails.
    h.stage(
      categoryFile(
        named('a', { status: '7' }),
        named('b', { parent: 'ghost' }),
        named('c', { status: '9' })
      )
    );
    h.clock.detached = true;
    let open: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const original = h.jobs.checkpoint.bind(h.jobs);
    let first = true;
    h.jobs.checkpoint = async (id, attempt, checkpoint) => {
      if (first) {
        first = false;
        await gate;
        throw new Error('connection terminated');
      }
      return original(id, attempt, checkpoint);
    };
    class Spy extends MemoryLookup {
      async categories(keys: readonly string[]) {
        await h.clock.advance(2500);
        setTimeout(open, 10);
        return super.categories(keys);
      }
    }
    h.deps.lookup = new Spy();
    await runValidation(1, h.deps);
    await h.clock.settle();
    expect(h.jobs.issues(1).map((issue) => issue.rowNumber)).toEqual([2, 4, 3]);
  });

  it('does not queue a write for every tick while one is slow', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    const original = h.jobs.checkpoint.bind(h.jobs);
    let calls = 0;
    h.jobs.checkpoint = async (id, attempt, checkpoint) => {
      calls += 1;
      if (calls === 1) await h.clock.advance(5000);
      return original(id, attempt, checkpoint);
    };
    slowStore(h, () => undefined, 2500);
    await runValidation(1, h.deps);
    // The slow write, and the last one when the run ends: the ticks that fell
    // due while the first was under way did nothing.
    expect(calls).toBe(2);
  });

  it('does not try to write once the job is no longer ours', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    let calls = 0;
    const original = h.jobs.checkpoint.bind(h.jobs);
    h.jobs.checkpoint = async (id, attempt, checkpoint) => {
      calls += 1;
      return original(id, attempt, checkpoint);
    };
    slowStore(h, () => h.jobs.delete(1), 2500);
    const slow = h.deps.lookup;
    h.deps.lookup = Object.assign(
      Object.create(Object.getPrototypeOf(slow)),
      slow,
      {
        categories: async (keys: readonly string[]) => {
          const found = await slow.categories(keys);
          // Ten more seconds go by after the job was noticed to be gone.
          await h.clock.advance(10_000);
          return found;
        }
      }
    );
    expect(await runValidation(1, h.deps)).toEqual({ outcome: 'lost' });
    expect(calls).toBe(1);
  });

  it('shows what the worker is doing: the stage is in the job while it works, and the totals of the last check are gone', async () => {
    const h = harness();
    h.stage(BAD_STATUS, {
      counts: { ...emptyCounts(), total: 99, createRows: 5, updateRows: 6 }
    });
    let seen: {
      stage: string | null;
      total: number;
      createRows: number;
    } | null = null;
    class Spy extends MemoryLookup {
      async categories(keys: readonly string[]) {
        await h.clock.advance(2500);
        const job = h.jobs.snapshot(1);
        seen = {
          stage: job.stage,
          total: job.counts.total,
          createRows: job.counts.createRows
        };
        return super.categories(keys);
      }
    }
    h.deps.lookup = new Spy();
    await runValidation(1, h.deps);
    expect(seen).toEqual({ stage: 'reading', total: 0, createRows: 0 });
    expect(h.jobs.snapshot(1).stage).toBeNull();
  });

  it('changes the job only by a checkpoint, even when the repository hands out live objects', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    h.jobs.get = async (id) => h.jobs.live(id);
    let errorsBeforeAnyWrite: number | null = null;
    class Spy extends MemoryLookup {
      async categories(keys: readonly string[]) {
        // No time has passed: no heartbeat has been written.
        errorsBeforeAnyWrite = h.jobs.live(1).counts.errors;
        return super.categories(keys);
      }
    }
    h.deps.lookup = new Spy();
    await runValidation(1, h.deps);
    expect(errorsBeforeAnyWrite).toBe(0);
    expect(h.jobs.snapshot(1).counts.errors).toBe(1);
  });

  it('leaves alone what belongs to the other phase: a check does not clear the cap flag of an import', async () => {
    const h = harness();
    h.stage(BAD_STATUS, {
      counts: {
        ...emptyCounts(),
        issuesTruncated: { validate: true, import: true },
        byCode: { validate: {}, import: { WRITE_FAILED: 500 } }
      }
    });
    await runValidation(1, h.deps);
    expect(h.jobs.snapshot(1).counts.issuesTruncated).toEqual({
      validate: false,
      import: true
    });
    expect(h.jobs.snapshot(1).counts.byCode.import).toEqual({
      WRITE_FAILED: 500
    });
  });
});

describe('the end of a run, in more detail', () => {
  it('fails the job when the engine breaks, even if the admin has asked to cancel', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    class Breaking extends MemoryLookup {
      async categories(): Promise<never> {
        h.jobs.setControl(1, 'cancel');
        await h.clock.advance(2500);
        throw new Error('boom');
      }
    }
    h.deps.lookup = new Breaking();
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('failed');
    expect(h.jobs.snapshot(1).status).toBe('failed');
  });

  it('keeps the first reason to stop: a cancel that came first is not turned into an interruption', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    const controller = new AbortController();
    slowStore(h, () => h.jobs.setControl(1, 'cancel'), 2500);
    const slow = h.deps.lookup;
    h.deps.lookup = Object.assign(
      Object.create(Object.getPrototypeOf(slow)),
      slow,
      {
        categories: async (keys: readonly string[]) => {
          const found = await slow.categories(keys);
          controller.abort();
          return found;
        }
      }
    );
    const result = await runValidation(1, h.deps, {
      signal: controller.signal
    });
    expect(result.outcome).toBe('canceled');
  });

  it('says the job is lost when it is taken away between the last write and the end', async () => {
    const h = harness();
    h.stage(BAD_STATUS);
    h.jobs.finish = async () => false;
    expect(await runValidation(1, h.deps)).toEqual({ outcome: 'lost' });
  });
});
