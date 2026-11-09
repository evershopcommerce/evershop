import { describe, it, expect } from '@jest/globals';
import { dispatchRequest } from '../../../services/dispatch/dispatchRequest.js';
import type { JobStatus } from '../../../services/job/types.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { FakeWorkerPool } from '../../../testing/FakeWorkerPool.js';
import { MemoryJobStore } from '../../../testing/MemoryJobStore.js';

// The uuids the doubles make are all digits, so upper-casing them proves nothing.
const LETTERS = 'abcdef01-2345-4678-89ab-cdef01234567';

function setup(maxWorkers = 2) {
  const jobs = new MemoryJobStore(new FakeClock());
  const workers = new FakeWorkerPool();
  const logger = new CollectingLogger();
  const deps = { jobs, workers, maxWorkers, logger };
  return { jobs, workers, logger, deps };
}

describe('dispatchRequest: a request for a worker', () => {
  it.each(['uploaded', 'queued'] as const)(
    'starts a worker for a job that is %s',
    async (status) => {
      const { jobs, workers, deps } = setup();
      const job = jobs.insert({ status });
      expect(await dispatchRequest(deps, job.uuid)).toBe('started');
      expect(workers.started).toEqual([job.uuid]);
    }
  );

  it('does not claim the job: the worker does', async () => {
    const { jobs, deps } = setup();
    const job = jobs.insert({ status: 'uploaded' });
    await dispatchRequest(deps, job.uuid);
    expect(jobs.snapshot(job.id)).toMatchObject({
      status: 'uploaded',
      attempt: 0,
      worker: null
    });
  });

  it('finds the job whatever the case of the uuid, and starts the worker with the stored one', async () => {
    const { jobs, workers, deps } = setup();
    const job = jobs.insert({ status: 'uploaded', uuid: LETTERS });
    expect(await dispatchRequest(deps, LETTERS.toUpperCase())).toBe('started');
    expect(workers.started).toEqual([LETTERS]);
    expect(job.uuid).toBe(LETTERS);
  });

  it.each([
    'uploading',
    'validating',
    'validated',
    'running',
    'completed',
    'failed',
    'stopped',
    'canceled',
    'interrupted'
  ] as const satisfies readonly JobStatus[])(
    'starts nothing for a job that is %s (a worker has it, or it has ended)',
    async (status) => {
      const { jobs, workers, logger, deps } = setup();
      const job = jobs.insert({ status });
      expect(await dispatchRequest(deps, job.uuid)).toBe('not_waiting');
      expect(workers.started).toEqual([]);
      expect(logger.of('info')[0].meta).toMatchObject({ status });
    }
  );

  it('starts nothing for a job that is gone', async () => {
    const { workers, deps } = setup();
    expect(
      await dispatchRequest(deps, '11111111-2222-4333-8444-555555555555')
    ).toBe('not_found');
    expect(workers.started).toEqual([]);
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['not-a-uuid'],
    [42],
    [{ jobUuid: '11111111-2222-4333-8444-555555555555' }],
    ['11111111-2222-4333-8444-5555555555555']
  ])('refuses %j, with a warning and without reading the jobs', async (bad) => {
    const { workers, logger, deps } = setup();
    const reads: string[] = [];
    const watching = {
      ...deps,
      jobs: {
        getByUuid: async (uuid: string) => {
          reads.push(uuid);
          return null;
        }
      }
    };
    expect(await dispatchRequest(watching, bad)).toBe('invalid');
    expect(reads).toEqual([]);
    expect(workers.started).toEqual([]);
    expect(logger.of('warn')).toHaveLength(1);
  });

  it('cuts what it writes about a bad request', async () => {
    const { logger, deps } = setup();
    await dispatchRequest(deps, 'x'.repeat(10_000));
    expect(String(logger.of('warn')[0].meta?.jobUuid)).toHaveLength(100);
  });
});

describe('dispatchRequest: the limit of workers of an instance', () => {
  it('leaves the job alone when the instance runs its limit, and says so', async () => {
    const { jobs, workers, logger, deps } = setup(2);
    const [a, b, c] = ['category', 'product', 'customer'].map((entity) =>
      jobs.insert({ entity: entity as 'category', status: 'uploaded' })
    );
    expect(await dispatchRequest(deps, a.uuid)).toBe('started');
    expect(await dispatchRequest(deps, b.uuid)).toBe('started');
    expect(await dispatchRequest(deps, c.uuid)).toBe('full');
    expect(workers.started).toEqual([a.uuid, b.uuid]);
    expect(jobs.snapshot(c.id).status).toBe('uploaded');
    expect(logger.of('info').at(-1)).toMatchObject({
      meta: { jobUuid: c.uuid, maxWorkers: 2 }
    });
  });

  it('starts again when a worker has ended', async () => {
    const { jobs, workers, deps } = setup(1);
    const a = jobs.insert({ entity: 'category', status: 'uploaded' });
    const b = jobs.insert({ entity: 'product', status: 'uploaded' });
    expect(await dispatchRequest(deps, a.uuid)).toBe('started');
    expect(await dispatchRequest(deps, b.uuid)).toBe('full');
    workers.finishOne();
    expect(await dispatchRequest(deps, b.uuid)).toBe('started');
  });

  it('cannot give the last place to two requests that are handled at the same time', async () => {
    const { jobs, workers, deps } = setup(1);
    const a = jobs.insert({ entity: 'category', status: 'uploaded' });
    const b = jobs.insert({ entity: 'product', status: 'uploaded' });
    const outcomes = await Promise.all([
      dispatchRequest(deps, a.uuid),
      dispatchRequest(deps, b.uuid)
    ]);
    expect([...outcomes].sort()).toEqual(['full', 'started']);
    expect(workers.started).toHaveLength(1);
  });

  it('starts a second worker for the same job when asked twice: the claim decides, not the dispatch', async () => {
    const { jobs, workers, deps } = setup(2);
    const job = jobs.insert({ status: 'uploaded' });
    await dispatchRequest(deps, job.uuid);
    await dispatchRequest(deps, job.uuid);
    expect(workers.started).toEqual([job.uuid, job.uuid]);
  });

  it('starts nothing at all when the limit is zero or less', async () => {
    const { jobs, workers, deps } = setup(0);
    const job = jobs.insert({ status: 'uploaded' });
    expect(await dispatchRequest(deps, job.uuid)).toBe('full');
    expect(workers.started).toEqual([]);
  });
});
