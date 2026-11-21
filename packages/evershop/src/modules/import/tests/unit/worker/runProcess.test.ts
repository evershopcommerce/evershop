import { describe, it, expect } from '@jest/globals';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { failUnstarted } from '../../../worker/failUnstarted.js';
import { runWorkerProcess } from '../../../worker/runProcess.js';
import type { WorkerProcessDeps } from '../../../worker/runProcess.js';
import { harness } from '../helpers/harness.js';

const GOOD = categoryFile(
  categoryRow({ url_key: 'a', name: 'A' }),
  categoryRow({ url_key: 'b', name: 'B', parent: 'a' })
);

type H = ReturnType<typeof harness>;

// The uuids the doubles make are all digits, so upper-casing them proves nothing.
const LETTERS = 'abcdef01-2345-4678-89ab-cdef01234567';

/** The process around a harness, with a boot that works unless a test says it does not. */
function processOf(h: H, more: Partial<WorkerProcessDeps> = {}) {
  const calls: string[] = [];
  const errors: unknown[] = [];
  const deps: WorkerProcessDeps = {
    async boot() {
      calls.push('boot');
    },
    compose() {
      calls.push('compose');
      return {
        deps: h.deps,
        admin: h.jobs,
        async close() {
          calls.push('close');
        }
      };
    },
    failUnstarted: (jobUuid, reason) =>
      failUnstarted(jobUuid, reason, {
        admin: h.jobs,
        jobs: h.jobs,
        workerId: 'host:42'
      }),
    workerId: 'host:42',
    signal: new AbortController().signal,
    logError: (e) => errors.push(e),
    ...more
  };
  return { deps, calls, errors };
}

describe('runWorkerProcess: a worker that starts', () => {
  it('boots, composes, runs the step of the status, closes, and gives the exit code of the run', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    const { deps, calls } = processOf(h);
    expect(await runWorkerProcess(job.uuid, deps)).toBe(0);
    expect(calls).toEqual(['boot', 'compose', 'close']);
    expect(h.jobs.snapshot(job.id)).toMatchObject({
      status: 'validated',
      worker: 'host:42'
    });
  });

  it('hands its signal to the run: a worker told to stop before it starts ends the job interrupted', async () => {
    const h = harness();
    const job = h.stage(GOOD, { status: 'queued' });
    const stop = new AbortController();
    stop.abort();
    const { deps } = processOf(h, { signal: stop.signal });
    expect(await runWorkerProcess(job.uuid, deps)).toBe(0);
    expect(h.jobs.snapshot(job.id).status).toBe('interrupted');
    expect(h.services.calls).toEqual([]);
  });

  it('gives 1 when the job could not run, and still closes', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    h.files.damage(job.id, 'flip-byte');
    const { deps, calls } = processOf(h);
    expect(await runWorkerProcess(job.uuid, deps)).toBe(1);
    expect(h.jobs.snapshot(job.id).status).toBe('failed');
    expect(calls).toEqual(['boot', 'compose', 'close']);
  });

  it('finds the job whatever the case of the uuid', async () => {
    const h = harness();
    const job = h.stage(GOOD, { uuid: LETTERS });
    const { deps } = processOf(h);
    expect(await runWorkerProcess(LETTERS.toUpperCase(), deps)).toBe(0);
    expect(h.jobs.snapshot(job.id).status).toBe('validated');
  });

  it('closes what it opened when the run throws, and lets the error go', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    const { deps, calls } = processOf(h, {
      compose: () => ({
        deps: h.deps,
        admin: {
          getByUuid: async () => {
            throw new Error('the database went away');
          }
        },
        async close() {
          calls.push('close');
        }
      })
    });
    await expect(runWorkerProcess(job.uuid, deps)).rejects.toThrow(
      'the database went away'
    );
    expect(calls).toEqual(['boot', 'close']);
  });
});

describe('runWorkerProcess: the argument', () => {
  it.each([[undefined], [''], ['not-a-uuid'], ['1']])(
    'gives 1 for %j and boots nothing',
    async (bad) => {
      const h = harness();
      const { deps, calls, errors } = processOf(h);
      expect(await runWorkerProcess(bad, deps)).toBe(1);
      expect(calls).toEqual([]);
      expect((errors[0] as Error).message).toContain('needs the uuid of a job');
    }
  );
});

describe('runWorkerProcess: a worker that cannot start (J2)', () => {
  const failing = (calls: string[], where: 'boot' | 'compose') =>
    ({
      boot: async () => {
        calls.push('boot');
        if (where === 'boot') throw new Error('an extension bootstrap threw');
      },
      compose: () => {
        calls.push('compose');
        throw new Error('the storage is not configured');
      }
    } as Partial<WorkerProcessDeps>);

  it.each(['boot', 'compose'] as const)(
    'ends an uploaded job failed with the reason when the %s fails, and gives 1',
    async (where) => {
      const h = harness();
      const job = h.stage(GOOD);
      const calls: string[] = [];
      const { deps, errors } = processOf(h, failing(calls, where));
      expect(await runWorkerProcess(job.uuid, deps)).toBe(1);
      const failed = h.jobs.snapshot(job.id);
      expect(failed.status).toBe('failed');
      expect(failed.errorMessage).toBe(
        where === 'boot'
          ? 'The import worker could not start: an extension bootstrap threw'
          : 'The import worker could not start: the storage is not configured'
      );
      expect(failed.finishedAt).not.toBeNull();
      expect(failed.expiresAt).not.toBeNull();
      expect(errors).toHaveLength(1);
      expect(h.services.calls).toEqual([]);
    }
  );

  it('ends a queued job failed too, and frees the place of the one import at a time', async () => {
    const h = harness();
    const job = h.stage(GOOD, { status: 'queued' });
    const { deps } = processOf(h, failing([], 'boot'));
    expect(await runWorkerProcess(job.uuid, deps)).toBe(1);
    expect(h.jobs.snapshot(job.id)).toMatchObject({
      status: 'failed',
      startedAt: null
    });
    const next = h.stage(GOOD, { id: 2, entity: 'product', status: 'queued' });
    expect(next.status).toBe('queued');
  });

  it('gives 1 and leaves the job as it was when the job cannot be ended either (the database is down)', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    const { deps, errors } = processOf(h, {
      ...failing([], 'boot'),
      failUnstarted: async () => {
        throw new Error('connection refused');
      }
    });
    expect(await runWorkerProcess(job.uuid, deps)).toBe(1);
    expect(h.jobs.snapshot(job.id).status).toBe('uploaded');
    expect(errors.map((e) => (e as Error).message)).toEqual([
      'an extension bootstrap threw',
      'connection refused'
    ]);
  });
});

describe('failUnstarted: only a job that waits for a worker is ended', () => {
  const deps = (h: H) => ({
    admin: h.jobs,
    jobs: h.jobs,
    workerId: 'host:42'
  });

  it('claims the job as a worker does, so that the attempt is counted', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    expect(await failUnstarted(job.uuid, new Error('boom'), deps(h))).toBe(
      true
    );
    expect(h.jobs.snapshot(job.id)).toMatchObject({
      status: 'failed',
      attempt: 1,
      worker: 'host:42'
    });
  });

  it.each([
    'validating',
    'validated',
    'running',
    'completed',
    'failed',
    'stopped',
    'canceled',
    'interrupted'
  ] as const)('leaves a job that is %s alone', async (status) => {
    const h = harness();
    const job = h.stage(GOOD, { status });
    const before = h.jobs.snapshot(job.id);
    expect(await failUnstarted(job.uuid, new Error('boom'), deps(h))).toBe(
      false
    );
    expect(h.jobs.snapshot(job.id)).toEqual(before);
  });

  it('does nothing for a job that is gone', async () => {
    const h = harness();
    expect(
      await failUnstarted(
        '11111111-2222-4333-8444-555555555555',
        new Error('boom'),
        deps(h)
      )
    ).toBe(false);
  });

  it('does nothing when another worker claims the job first', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    const rival = {
      ...deps(h),
      jobs: {
        claim: async () => null,
        finish: async () => {
          throw new Error('must not finish a job it did not claim');
        }
      }
    };
    expect(await failUnstarted(job.uuid, new Error('boom'), rival)).toBe(false);
    expect(h.jobs.snapshot(job.id).status).toBe('uploaded');
  });

  it('writes the first line of the reason only, and at most 500 characters', async () => {
    const h = harness();
    const a = h.stage(GOOD);
    await failUnstarted(a.uuid, new Error('first\nsecond\nthird'), deps(h));
    expect(h.jobs.snapshot(a.id).errorMessage).toBe(
      'The import worker could not start: first'
    );
    const b = h.stage(GOOD, { id: 2, entity: 'product' });
    await failUnstarted(b.uuid, new Error('x'.repeat(2000)), deps(h));
    expect(h.jobs.snapshot(b.id).errorMessage).toHaveLength(500);
  });

  it('finds the job whatever the case of the uuid', async () => {
    const h = harness();
    const job = h.stage(GOOD, { uuid: LETTERS });
    expect(
      await failUnstarted(LETTERS.toUpperCase(), new Error('boom'), deps(h))
    ).toBe(true);
    expect(h.jobs.snapshot(job.id).status).toBe('failed');
  });

  it('takes a reason that is not an Error', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    await failUnstarted(job.uuid, 'plain text', deps(h));
    expect(h.jobs.snapshot(job.id).errorMessage).toBe(
      'The import worker could not start: plain text'
    );
  });
});
