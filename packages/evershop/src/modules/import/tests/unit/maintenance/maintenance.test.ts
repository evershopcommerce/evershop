import { describe, it, expect } from '@jest/globals';
import { dispatchRequest } from '../../../services/dispatch/dispatchRequest.js';
import {
  DEAD_AFTER_MS,
  DISPATCH_AFTER_MS,
  UPLOAD_IDLE_MS
} from '../../../services/job/transitions.js';
import {
  cleanUpJobs,
  dispatchWaitingJobs,
  recoverDeadJobs,
  recoveredMessage
} from '../../../services/maintenance/maintenance.js';
import type { JobMaintenance } from '../../../services/ports/jobMaintenance.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { FakeWorkerPool } from '../../../testing/FakeWorkerPool.js';
import { MemoryJobRequests } from '../../../testing/MemoryJobRequests.js';
import { MemoryJobStore } from '../../../testing/MemoryJobStore.js';

function setup() {
  const clock = new FakeClock();
  const jobs = new MemoryJobStore(clock);
  const requests = new MemoryJobRequests();
  const logger = new CollectingLogger();
  return { clock, jobs, requests, logger };
}

describe('the times of § 8.4 and 8.7', () => {
  it('are two minutes, ten minutes and thirty seconds', () => {
    expect(DEAD_AFTER_MS).toBe(2 * 60_000);
    expect(UPLOAD_IDLE_MS).toBe(10 * 60_000);
    expect(DISPATCH_AFTER_MS).toBe(30_000);
  });
});

describe('recoverDeadJobs (importRecover)', () => {
  it('asks for the jobs whose worker has been silent for two minutes, with a message the admin can read', async () => {
    const seen: Array<[number, string]> = [];
    const maintenance: Pick<JobMaintenance, 'recoverDead'> = {
      async recoverDead(after, message) {
        seen.push([after, message]);
        return [];
      }
    };
    await recoverDeadJobs({ maintenance, logger: new CollectingLogger() });
    expect(seen).toEqual([[120_000, recoveredMessage(120_000)]]);
    expect(recoveredMessage(120_000)).toBe(
      'The import stopped: its worker did not report for 120 seconds (the server may have been restarted). Resume it to continue.'
    );
  });

  it('interrupts a dead job, says so for each, and leaves a live one', async () => {
    const { clock, jobs, logger } = setup();
    const dead = jobs.insert({
      status: 'running',
      startedAt: clock.now(),
      heartbeatAt: clock.now()
    });
    await clock.advance(3 * 60_000);
    const alive = jobs.insert({
      entity: 'product',
      status: 'validating',
      heartbeatAt: clock.now()
    });
    const recovered = await recoverDeadJobs({ maintenance: jobs, logger });
    expect(recovered).toEqual([
      { uuid: dead.uuid, entity: 'category', was: 'running' }
    ]);
    expect(jobs.snapshot(dead.id)).toMatchObject({
      status: 'interrupted',
      errorMessage: recoveredMessage(DEAD_AFTER_MS)
    });
    expect(jobs.snapshot(alive.id).status).toBe('validating');
    expect(logger.of('warn')).toEqual([
      expect.objectContaining({
        meta: { jobUuid: dead.uuid, entity: 'category', was: 'running' }
      })
    ]);
  });

  it('says nothing when nothing died', async () => {
    const { jobs, logger } = setup();
    expect(await recoverDeadJobs({ maintenance: jobs, logger })).toEqual([]);
    expect(logger.lines).toEqual([]);
  });
});

describe('dispatchWaitingJobs (importDispatch)', () => {
  it('asks again, oldest first, for the jobs that waited more than thirty seconds', async () => {
    const { clock, jobs, requests, logger } = setup();
    const a = jobs.insert({ status: 'uploaded' });
    await clock.advance(10_000);
    const b = jobs.insert({ entity: 'product', status: 'queued' });
    await clock.advance(25_000);
    // a has waited 35 s, b 25 s.
    const report = await dispatchWaitingJobs({
      maintenance: jobs,
      requests,
      logger
    });
    expect(report).toEqual({ asked: 1, inFlight: 0, failed: 0 });
    expect(requests.requested).toEqual([a.uuid]);
    await clock.advance(10_000);
    await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    // a already has its request on its way; b is asked for now.
    expect(requests.requested).toEqual([a.uuid, b.uuid]);
  });

  it('does not ask again for a job that already has a request on its way', async () => {
    const { clock, jobs, requests, logger } = setup();
    const job = jobs.insert({ status: 'uploaded' });
    await requests.request(job.uuid);
    await clock.advance(31_000);
    for (let minute = 0; minute < 5; minute += 1) {
      // eslint-disable-next-line no-await-in-loop
      const report = await dispatchWaitingJobs({
        maintenance: jobs,
        requests,
        logger
      });
      expect(report).toEqual({ asked: 0, inFlight: 1, failed: 0 });
      // eslint-disable-next-line no-await-in-loop
      await clock.advance(60_000);
    }
    expect(requests.requested).toEqual([job.uuid]);
  });

  it('asks once the earlier request has been taken off the queue', async () => {
    const { clock, jobs, requests, logger } = setup();
    const job = jobs.insert({ status: 'queued' });
    await requests.request(job.uuid);
    await clock.advance(31_000);
    await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    requests.take();
    const report = await dispatchWaitingJobs({
      maintenance: jobs,
      requests,
      logger
    });
    expect(report.asked).toBe(1);
    expect(requests.requested).toEqual([job.uuid, job.uuid]);
  });

  it('goes on with the other jobs when one request cannot be written, and says which', async () => {
    const { clock, jobs, requests, logger } = setup();
    const a = jobs.insert({ entity: 'category', status: 'uploaded' });
    const b = jobs.insert({ entity: 'product', status: 'uploaded' });
    await clock.advance(31_000);
    requests.failNext();
    const report = await dispatchWaitingJobs({
      maintenance: jobs,
      requests,
      logger
    });
    expect(report).toEqual({ asked: 1, inFlight: 0, failed: 1 });
    expect(requests.requested).toEqual([b.uuid]);
    expect(logger.of('error')[0].meta).toMatchObject({ jobUuid: a.uuid });
  });

  it('says nothing when every waiting job already has its request', async () => {
    const { clock, jobs, requests, logger } = setup();
    const job = jobs.insert({ status: 'uploaded' });
    await requests.request(job.uuid);
    await clock.advance(31_000);
    await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    expect(logger.lines).toEqual([]);
  });

  it('says how many jobs it offered again', async () => {
    const { clock, jobs, requests, logger } = setup();
    jobs.insert({ entity: 'category', status: 'uploaded' });
    jobs.insert({ entity: 'product', status: 'queued' });
    await clock.advance(31_000);
    await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    expect(logger.of('info')).toEqual([
      expect.objectContaining({
        meta: { asked: 2, inFlight: 0, failed: 0 }
      })
    ]);
  });

  it('does not ask the queue anything when nobody waits', async () => {
    const { jobs, logger } = setup();
    let asked = 0;
    const requests = {
      request: async () => undefined,
      inFlight: async () => {
        asked += 1;
        return new Set<string>();
      }
    };
    const report = await dispatchWaitingJobs({
      maintenance: jobs,
      requests,
      logger
    });
    expect(report).toEqual({ asked: 0, inFlight: 0, failed: 0 });
    expect(asked).toBe(0);
    expect(logger.lines).toEqual([]);
  });

  it('uses the quiet time of thirty seconds', async () => {
    const seen: number[] = [];
    await dispatchWaitingJobs({
      maintenance: {
        waitingForWorker: async (quiet) => {
          seen.push(quiet);
          return [];
        }
      },
      requests: new MemoryJobRequests(),
      logger: new CollectingLogger()
    });
    expect(seen).toEqual([30_000]);
  });
});

describe('the request, the instance and the cron, together (J4, and a full instance)', () => {
  it('repairs a lost event: after thirty seconds the cron asks, and the subscriber starts the worker', async () => {
    const { clock, jobs, requests, logger } = setup();
    const workers = new FakeWorkerPool();
    const deps = { jobs, workers, maxWorkers: 2, logger };
    const job = jobs.insert({ status: 'uploaded' });
    // The event was lost: nothing was written, nothing is on its way.
    await clock.advance(31_000);
    await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    for (const uuid of requests.take()) {
      expect(await dispatchRequest(deps, uuid)).toBe('started');
    }
    expect(workers.started).toEqual([job.uuid]);
  });

  it('repairs a request dropped by an instance that was full', async () => {
    const { clock, jobs, requests, logger } = setup();
    const workers = new FakeWorkerPool();
    const deps = { jobs, workers, maxWorkers: 1, logger };
    const busy = jobs.insert({ entity: 'product', status: 'uploaded' });
    const job = jobs.insert({ entity: 'category', status: 'uploaded' });
    expect(await dispatchRequest(deps, busy.uuid)).toBe('started');
    // The event of the second job is consumed and finds the instance full.
    await requests.request(job.uuid);
    for (const uuid of requests.take()) {
      expect(await dispatchRequest(deps, uuid)).toBe('full');
    }
    expect(workers.started).toEqual([busy.uuid]);
    // The first worker ends (and has taken its job); thirty seconds go by.
    workers.finishOne();
    jobs.setStatus(busy.id, 'validated');
    await clock.advance(31_000);
    await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    for (const uuid of requests.take()) {
      expect(await dispatchRequest(deps, uuid)).toBe('started');
    }
    expect(workers.started).toEqual([busy.uuid, job.uuid]);
  });

  it('does not pile up requests behind a slow queue', async () => {
    const { clock, jobs, requests, logger } = setup();
    jobs.insert({ status: 'uploaded' });
    await clock.advance(31_000);
    await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    for (let minute = 0; minute < 30; minute += 1) {
      // eslint-disable-next-line no-await-in-loop
      await clock.advance(60_000);
      // eslint-disable-next-line no-await-in-loop
      await dispatchWaitingJobs({ maintenance: jobs, requests, logger });
    }
    expect(requests.requested).toHaveLength(1);
  });
});

describe('cleanUpJobs (importCleanup)', () => {
  it('asks to delete the uploads that stopped ten minutes ago', async () => {
    const seen: number[] = [];
    await cleanUpJobs({
      maintenance: {
        cleanUp: async (idle) => {
          seen.push(idle);
          return { abandonedUploads: 0, expiredJobs: 0, filesDropped: 0 };
        }
      },
      logger: new CollectingLogger()
    });
    expect(seen).toEqual([600_000]);
  });

  it.each([
    [{ abandonedUploads: 1, expiredJobs: 0, filesDropped: 0 }],
    [{ abandonedUploads: 0, expiredJobs: 1, filesDropped: 0 }],
    [{ abandonedUploads: 0, expiredJobs: 0, filesDropped: 1 }]
  ])('says it when it deleted only %j', async (result) => {
    const logger = new CollectingLogger();
    await cleanUpJobs({ maintenance: { cleanUp: async () => result }, logger });
    expect(logger.of('info')).toHaveLength(1);
    expect(logger.of('info')[0].meta).toEqual(result);
  });

  it('says what it deleted, and says nothing when it deleted nothing', async () => {
    const { clock, jobs, logger } = setup();
    expect(await cleanUpJobs({ maintenance: jobs, logger })).toEqual({
      abandonedUploads: 0,
      expiredJobs: 0,
      filesDropped: 0
    });
    expect(logger.lines).toEqual([]);
    jobs.insert({ status: 'validated', expiresAt: clock.now() + 1000 });
    await clock.advance(5000);
    expect(await cleanUpJobs({ maintenance: jobs, logger })).toMatchObject({
      expiredJobs: 1
    });
    expect(logger.of('info')[0].meta).toEqual({
      abandonedUploads: 0,
      expiredJobs: 1,
      filesDropped: 0
    });
  });
});
