import { describe, it, expect } from '@jest/globals';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { runWorker } from '../../../worker/runWorker.js';
import { harness } from '../helpers/harness.js';

const named = (url_key: string, parent = '') =>
  categoryRow({ url_key, name: url_key.toUpperCase(), parent });

const GOOD = categoryFile(named('a'), named('b', 'a'));

const run = (
  h: ReturnType<typeof harness>,
  uuid: string,
  signal?: AbortSignal
) =>
  runWorker(uuid, {
    deps: h.deps,
    admin: h.jobs,
    workerId: 'host:42',
    signal
  });

describe('runWorker: the step that belongs to the status of the job', () => {
  it('checks an uploaded job, and ends 0', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    const result = await run(h, job.uuid);
    expect(result).toEqual({ outcome: 'validated', exitCode: 0 });
    expect(h.jobs.snapshot(job.id)).toMatchObject({
      status: 'validated',
      worker: 'host:42'
    });
    expect(h.services.calls).toEqual([]);
  });

  it('imports a queued job, and ends 0', async () => {
    const h = harness();
    const job = h.stage(GOOD, { status: 'queued' });
    const result = await run(h, job.uuid);
    expect(result).toEqual({ outcome: 'completed', exitCode: 0 });
    expect(h.jobs.snapshot(job.id).counts).toMatchObject({ created: 2 });
    expect(h.services.calls).toHaveLength(2);
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
  ] as const)(
    'finds nothing to do for a job that is %s, writes nothing, and ends 0',
    async (status) => {
      const h = harness();
      const job = h.stage(GOOD, { status });
      const before = h.jobs.snapshot(job.id);
      const result = await run(h, job.uuid);
      expect(result).toEqual({ outcome: 'not_runnable', exitCode: 0 });
      expect(h.jobs.snapshot(job.id)).toEqual(before);
      expect(h.services.calls).toEqual([]);
      expect(h.files.opened.get(job.id) ?? 0).toBe(0);
    }
  );

  it('ends 0 quietly for a job that is not there (it was deleted)', async () => {
    const h = harness();
    const result = await run(h, '11111111-2222-4333-8444-555555555555');
    expect(result).toEqual({ outcome: 'not_found', exitCode: 0 });
  });

  it('ends 1 when the job could not run: a file that is damaged', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    h.files.damage(job.id, 'flip-byte');
    const result = await run(h, job.uuid);
    expect(result).toEqual({ outcome: 'failed', exitCode: 1 });
    expect(h.jobs.snapshot(job.id).status).toBe('failed');
  });

  it('ends the job interrupted, and 0, when it is told to stop (SIGTERM)', async () => {
    const h = harness();
    const job = h.stage(GOOD, { status: 'queued' });
    const controller = new AbortController();
    controller.abort();
    const result = await run(h, job.uuid, controller.signal);
    expect(result).toEqual({ outcome: 'interrupted', exitCode: 0 });
    expect(h.jobs.snapshot(job.id).status).toBe('interrupted');
    expect(h.services.calls).toEqual([]);
  });

  it('ends 0, doing nothing, for a worker that came second to the same job', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    const [a, b] = await Promise.all([run(h, job.uuid), run(h, job.uuid)]);
    expect([a.exitCode, b.exitCode]).toEqual([0, 0]);
    expect([a.outcome, b.outcome].sort()).toEqual(['not_claimed', 'validated']);
    expect(h.jobs.snapshot(job.id).attempt).toBe(1);
  });

  it('says what it did in the log', async () => {
    const h = harness();
    const job = h.stage(GOOD);
    await run(h, job.uuid);
    const lines = h.logger.lines.map((line) => line.message);
    expect(lines).toContain('The import run ended');
    expect(JSON.stringify(h.logger.lines)).toContain(job.uuid);
  });
});
