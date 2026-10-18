import { describe, it, expect } from '@jest/globals';
import { emptyCounts } from '../../../services/job/types.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { MemoryJobRepository } from '../../../testing/MemoryJobRepository.js';

/**
 * The double must behave like the real repository (§ 4.5, point 6): the status
 * machine of § 8.4, the claim as a compare-and-swap, and every later write fenced
 * by the attempt. These cases are the start of the contract suite that
 * `PgJobRepository` will have to pass too.
 */
const setup = () => {
  const clock = new FakeClock();
  const repo = new MemoryJobRepository(clock);
  return { clock, repo };
};

const issue = (
  rowNumber: number | null,
  severity: 'error' | 'warning' = 'error'
) => ({
  phase: 'validate' as const,
  rowNumber,
  entityKey: 'k',
  column: null,
  code: 'INVALID_VALUE',
  severity,
  params: {},
  message: 'm',
  value: null
});

describe('MemoryJobRepository: the claim', () => {
  it('moves uploaded to validating and queued to running, and raises the attempt', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    repo.insert({ id: 2, status: 'queued' });
    expect(await repo.claim(1, 'uploaded', 'validating', 'host:1')).toBe(1);
    expect(await repo.claim(2, 'queued', 'running', 'host:2')).toBe(1);
    expect(repo.snapshot(1)).toMatchObject({
      status: 'validating',
      attempt: 1,
      worker: 'host:1',
      expiresAt: null
    });
    expect(repo.snapshot(2).status).toBe('running');
  });

  it('is a compare-and-swap: the second claim gets nothing', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    expect(await repo.claim(1, 'uploaded', 'validating', 'a')).toBe(1);
    expect(await repo.claim(1, 'uploaded', 'validating', 'b')).toBeNull();
    expect(repo.snapshot(1).worker).toBe('a');
  });

  it('gets nothing for a job that is gone', async () => {
    const { repo } = setup();
    expect(await repo.claim(9, 'uploaded', 'validating', 'a')).toBeNull();
  });

  it('refuses a claim that is not one a worker makes', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'validated' });
    await expect(repo.claim(1, 'validated', 'running', 'a')).rejects.toThrow(
      'cannot claim'
    );
  });
});

describe('MemoryJobRepository: the fence', () => {
  it('lets the worker with the current attempt write, and no other', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    const checkpoint = { counts: emptyCounts(), issues: [issue(2)] };
    expect(await repo.checkpoint(1, attempt, checkpoint)).toEqual({
      ok: true,
      control: null
    });
    expect(await repo.checkpoint(1, attempt + 1, checkpoint)).toEqual({
      ok: false
    });
    expect(await repo.markStarted(1, attempt + 1)).toBe(false);
    expect(await repo.clearIssues(1, attempt + 1, 'validate')).toBe(false);
    expect(await repo.finish(1, attempt + 1, 'validated')).toBe(false);
    expect(repo.issues(1)).toHaveLength(1);
  });

  it('refuses every write once the job is deleted, canceled or finished', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    expect(await repo.finish(1, attempt, 'validated')).toBe(true);
    expect(
      await repo.checkpoint(1, attempt, { counts: emptyCounts(), issues: [] })
    ).toEqual({
      ok: false
    });
    repo.insert({ id: 2, status: 'uploaded' });
    const second = (await repo.claim(
      2,
      'uploaded',
      'validating',
      'a'
    )) as number;
    repo.delete(2);
    expect(
      await repo.checkpoint(2, second, { counts: emptyCounts(), issues: [] })
    ).toEqual({
      ok: false
    });
  });

  it('tells the worker about a cancel', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'queued' });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    repo.setControl(1, 'cancel');
    expect(
      await repo.checkpoint(1, attempt, { counts: emptyCounts(), issues: [] })
    ).toEqual({
      ok: true,
      control: 'cancel'
    });
  });
});

describe('MemoryJobRepository: what a checkpoint writes', () => {
  it('writes the counts, the stage, the heartbeat and the problems together', async () => {
    const { repo, clock } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    await clock.advance(2000);
    const counts = { ...emptyCounts(), total: 5, errors: 1 };
    await repo.checkpoint(1, attempt, {
      counts,
      stage: 'reading',
      issues: [issue(3)]
    });
    expect(repo.snapshot(1)).toMatchObject({
      stage: 'reading',
      counts: { total: 5, errors: 1 },
      heartbeatAt: clock.now()
    });
    expect(repo.issues(1, 'validate')).toHaveLength(1);
    expect(repo.checkpoints).toBe(1);
  });

  it('keeps the problems of each phase apart, and clears one phase', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'queued' });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    await repo.checkpoint(1, attempt, {
      counts: emptyCounts(),
      issues: [issue(2), { ...issue(3), phase: 'import' }]
    });
    expect(await repo.clearIssues(1, attempt, 'import')).toBe(true);
    expect(repo.issues(1).map((i) => i.phase)).toEqual(['validate']);
  });

  it('gives back the rows that have a problem of severity error', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'queued' });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    await repo.checkpoint(1, attempt, {
      counts: emptyCounts(),
      issues: [
        { ...issue(4), phase: 'import' },
        { ...issue(5, 'warning'), phase: 'import' },
        { ...issue(null), phase: 'import' },
        { ...issue(6), phase: 'validate' }
      ]
    });
    expect([...(await repo.errorRows(1, 'import'))]).toEqual([4]);
  });

  it('sets started_at once and never clears it', async () => {
    const { repo, clock } = setup();
    repo.insert({ id: 1, status: 'queued' });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    await repo.markStarted(1, attempt);
    const first = repo.snapshot(1).startedAt;
    await clock.advance(5000);
    await repo.markStarted(1, attempt);
    expect(repo.snapshot(1).startedAt).toBe(first);
  });

  it('hands out copies: a worker cannot change a job by holding it', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const job = await repo.get(1);
    (job as { counts: { total: number } }).counts.total = 99;
    expect(repo.snapshot(1).counts.total).toBe(0);
  });
});

describe('MemoryJobRepository: the end of a run', () => {
  it('lets validating end in validated, failed, canceled or interrupted only', async () => {
    for (const to of [
      'validated',
      'failed',
      'canceled',
      'interrupted'
    ] as const) {
      const { repo } = setup();
      repo.insert({ id: 1, status: 'uploaded' });
      const attempt = (await repo.claim(
        1,
        'uploaded',
        'validating',
        'a'
      )) as number;
      expect(await repo.finish(1, attempt, to)).toBe(true);
      expect(repo.snapshot(1).status).toBe(to);
    }
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    await expect(repo.finish(1, attempt, 'completed')).rejects.toThrow(
      'cannot take a job'
    );
  });

  it('lets running end in completed, stopped, interrupted, failed or canceled', async () => {
    for (const to of [
      'completed',
      'stopped',
      'interrupted',
      'failed',
      'canceled'
    ] as const) {
      const { repo } = setup();
      repo.insert({ id: 1, status: 'queued', startedAt: 1 });
      const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
      expect(await repo.finish(1, attempt, to)).toBe(true);
    }
  });

  it('sends a running job back to validated only if it has written nothing', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'queued' });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    expect(
      await repo.finish(1, attempt, 'validated', { errorMessage: 'back' })
    ).toBe(true);
    expect(repo.snapshot(1)).toMatchObject({
      status: 'validated',
      errorMessage: 'back'
    });
    repo.insert({ id: 2, status: 'queued', startedAt: 5 });
    const second = (await repo.claim(2, 'queued', 'running', 'a')) as number;
    await expect(repo.finish(2, second, 'validated')).rejects.toThrow(
      'written something'
    );
  });

  it('sets finished_at for a final status, expires_at for every end, and clears the stage and the control', async () => {
    const { repo, clock } = setup();
    repo.insert({
      id: 1,
      status: 'queued',
      stage: 'writing',
      control: 'cancel'
    });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    await repo.finish(1, attempt, 'completed');
    const job = repo.snapshot(1);
    expect(job.finishedAt).toBe(clock.now());
    expect(job.expiresAt).toBe(clock.now() + 7 * 86_400_000);
    expect([job.stage, job.control]).toEqual([null, null]);
    repo.insert({ id: 2, status: 'queued' });
    const second = (await repo.claim(2, 'queued', 'running', 'a')) as number;
    await repo.finish(2, second, 'stopped');
    expect(repo.snapshot(2).finishedAt).toBeNull();
    expect(repo.snapshot(2).expiresAt).not.toBeNull();
  });
});
