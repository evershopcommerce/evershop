import { describe, it, expect } from '@jest/globals';
import { emptyCounts } from '../../../services/job/types.js';
import { RETENTION_MS } from '../../../services/job/transitions.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { MemoryJobRepository } from '../../../testing/MemoryJobRepository.js';

/**
 * What the double does beyond the contract of a `JobRepository`
 * (`tests/unit/adapters/jobRepositoryContract.test.ts`, which `PgJobRepository`
 * has to pass too): it reads a fake clock, so the times are exact, and it has
 * the handles a test needs to look at a run and to break it.
 */
const setup = () => {
  const clock = new FakeClock();
  const repo = new MemoryJobRepository(clock);
  return { clock, repo };
};

const issue = (rowNumber: number | null) => ({
  phase: 'validate' as const,
  rowNumber,
  entityKey: 'k',
  column: null,
  code: 'INVALID_VALUE',
  severity: 'error' as const,
  params: {},
  message: 'm',
  value: null
});

describe('MemoryJobRepository: the times come from the clock it is given', () => {
  it('writes the heartbeat at the time of the checkpoint', async () => {
    const { repo, clock } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    expect(repo.snapshot(1).heartbeatAt).toBe(clock.now());
    await clock.advance(2000);
    await repo.checkpoint(1, attempt, { counts: emptyCounts(), issues: [] });
    expect(repo.snapshot(1).heartbeatAt).toBe(clock.now());
  });

  it('sets started_at at the time of the first call only', async () => {
    const { repo, clock } = setup();
    repo.insert({ id: 1, status: 'queued' });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    const first = clock.now();
    await repo.markStarted(1, attempt);
    await clock.advance(5000);
    await repo.markStarted(1, attempt);
    expect(repo.snapshot(1).startedAt).toBe(first);
  });

  it('sets finished_at and expires_at at the time of the end', async () => {
    const { repo, clock } = setup();
    repo.insert({ id: 1, status: 'queued' });
    const attempt = (await repo.claim(1, 'queued', 'running', 'a')) as number;
    await repo.finish(1, attempt, 'completed');
    const job = repo.snapshot(1);
    expect(job.finishedAt).toBe(clock.now());
    expect(job.expiresAt).toBe(clock.now() + RETENTION_MS);
  });

  it('keeps a finished job for the time it is told to', async () => {
    const clock = new FakeClock();
    const repo = new MemoryJobRepository(clock, 60_000);
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    await repo.finish(1, attempt, 'validated');
    expect(repo.snapshot(1).expiresAt).toBe(clock.now() + 60_000);
  });
});

describe('MemoryJobRepository: the handles of a test', () => {
  it('counts the checkpoints it wrote', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    await repo.checkpoint(1, attempt, { counts: emptyCounts(), issues: [] });
    await repo.checkpoint(1, attempt, { counts: emptyCounts(), issues: [] });
    expect(repo.checkpoints).toBe(2);
  });

  it('fails the next checkpoints it is told to, and writes nothing for them', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    repo.failNextCheckpoints(2);
    const work = { counts: { ...emptyCounts(), total: 4 }, issues: [issue(2)] };
    await expect(repo.checkpoint(1, attempt, work)).rejects.toThrow(
      'connection terminated'
    );
    await expect(repo.checkpoint(1, attempt, work)).rejects.toThrow(
      'connection terminated'
    );
    expect(repo.snapshot(1).counts.total).toBe(0);
    expect(repo.issues(1)).toEqual([]);
    expect(await repo.checkpoint(1, attempt, work)).toEqual({
      ok: true,
      control: null
    });
    expect(repo.issues(1)).toHaveLength(1);
  });

  it('makes a worker stale when someone else claims the job (bumpAttempt)', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'uploaded' });
    const attempt = (await repo.claim(
      1,
      'uploaded',
      'validating',
      'a'
    )) as number;
    repo.bumpAttempt(1);
    expect(
      await repo.checkpoint(1, attempt, { counts: emptyCounts(), issues: [] })
    ).toEqual({ ok: false });
  });

  it('deletes the problems with the job', async () => {
    const { repo } = setup();
    repo.insert({ id: 1, status: 'validated' });
    repo.seedIssues(1, [issue(2), issue(3)]);
    repo.delete(1);
    expect(repo.issues(1)).toEqual([]);
    expect(await repo.get(1)).toBeNull();
  });

  it('gives the job itself with live(), and a copy with snapshot()', () => {
    const { repo } = setup();
    repo.insert({ id: 1 });
    repo.live(1).counts.total = 5;
    expect(repo.snapshot(1).counts.total).toBe(5);
    repo.snapshot(1).counts.total = 9;
    expect(repo.live(1).counts.total).toBe(5);
  });
});
