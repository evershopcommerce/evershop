import { Readable } from 'stream';
import { describe, it, expect } from '@jest/globals';
import { emptyCounts } from '../../../services/job/types.js';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { runImport } from '../../../services/runner/index.js';
import { harness } from '../helpers/harness.js';

const named = (url_key: string, parent = '', more = {}) =>
  categoryRow({ url_key, name: url_key.toUpperCase(), parent, ...more });

const keys = (n: number, prefix = 'k') =>
  Array.from({ length: n }, (_, i) => `${prefix}${String(i).padStart(2, '0')}`);

/** A job that was checked and started: what the API leaves for a worker. */
const queued = { status: 'queued' as const };

const tree = (h: ReturnType<typeof harness>) =>
  Object.fromEntries(
    [...h.lookup.stored.values()].map((c) => [c.urlKey, c.parentUrlKey])
  );

describe('runImport: a file that is clean', () => {
  const FILE = categoryFile(
    named('child', 'root'),
    named('root'),
    named('other')
  );

  it('checks the file again, then writes it in plan order, and completes', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const result = await runImport(1, h.deps, { worker: 'host:9' });
    expect(result.outcome).toBe('completed');
    expect(tree(h)).toEqual({ root: null, other: null, child: 'root' });
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual([
      'root',
      'other',
      'child'
    ]);
    const job = h.jobs.snapshot(1);
    expect(job).toMatchObject({
      status: 'completed',
      attempt: 1,
      worker: 'host:9',
      stage: null,
      errorMessage: null,
      counts: {
        created: 3,
        updated: 0,
        failed: 0,
        skipped: 0,
        lastUnit: 3,
        total: 3,
        createRows: 3
      }
    });
    expect(job.startedAt).not.toBeNull();
    expect(job.finishedAt).not.toBeNull();
    expect(h.clock.running).toBe(0);
  });

  it('reads the file for the check, for the plan and once for each level', async () => {
    const h = harness();
    h.stage(FILE, queued);
    await runImport(1, h.deps);
    // The check (2 reads), the plan (1) and two levels (2).
    expect(h.files.opened.get(1)).toBe(5);
  });

  it('does not fetch an image while it checks', async () => {
    const h = harness();
    h.stage(
      categoryFile(named('a', '', { image: 'https://example.com/women.jpg' })),
      queued
    );
    await runImport(1, h.deps);
    expect(h.images.probed).toEqual([]);
    expect(h.images.fetched).toEqual(['https://example.com/women.jpg']);
  });

  it('updates what exists and creates what does not (mode upsert)', async () => {
    const h = harness({ store: { categories: [{ urlKey: 'root' }] } });
    h.stage(FILE, queued);
    await runImport(1, h.deps);
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      created: 2,
      updated: 1,
      lastUnit: 3
    });
  });
});

describe('runImport: the check at the start (D-33, J6)', () => {
  const FILE = categoryFile(named('kid', 'ghost'), named('other'));

  it('sends the job back to validated, with the new problems, and writes nothing', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.services.calls).toEqual([]);
    expect(h.lookup.stored.size).toBe(0);
    const job = h.jobs.snapshot(1);
    expect(job).toMatchObject({
      status: 'validated',
      startedAt: null,
      counts: { errors: 1 }
    });
    expect(job.errorMessage).toContain('nothing was written');
    expect(h.jobs.issues(1, 'validate')).toMatchObject([
      { code: 'REFERENCE_NOT_FOUND', rowNumber: 2, entityKey: 'kid' }
    ]);
    expect(h.clock.running).toBe(0);
  });

  it('counts the bytes of the two passes on as one run, so that the page shows one bar', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const size = h.jobs.snapshot(1).fileSize;
    let opens = 0;
    let atSecondPass: { stage: string | null; bytesRead: number } | null = null;
    const open = h.deps.files.open.bind(h.deps.files);
    h.deps.files.open = (jobId) => {
      opens += 1;
      const inner = open(jobId);
      if (opens !== 2) return inner;
      // The second pass of the check waits for the heartbeat before it reads a byte.
      return Readable.from(
        (async function* second() {
          await h.clock.advance(2500);
          const job = h.jobs.snapshot(1);
          atSecondPass = { stage: job.stage, bytesRead: job.counts.bytesRead };
          for await (const chunk of inner) yield chunk;
        })()
      );
    };
    await runImport(1, h.deps);
    expect(atSecondPass).toEqual({ stage: 'rechecking', bytesRead: size });
  });

  it('replaces the problems of the earlier check', async () => {
    const h = harness();
    h.stage(FILE, queued);
    h.jobs.seedIssues(1, [
      {
        phase: 'validate',
        rowNumber: 99,
        entityKey: 'stale',
        column: null,
        code: 'OLD',
        severity: 'error',
        params: {},
        message: 'm',
        value: null
      }
    ]);
    await runImport(1, h.deps);
    expect(h.jobs.issues(1, 'validate').map((i) => i.code)).toEqual([
      'REFERENCE_NOT_FOUND'
    ]);
  });

  it('goes on to write when the file is clean, and keeps its warnings', async () => {
    const h = harness();
    h.stage('url_key,name,status,colour\nwomen,Women,1,red\n', queued);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.issues(1, 'validate').map((i) => i.code)).toEqual([
      'UNKNOWN_COLUMN'
    ]);
    expect(h.jobs.snapshot(1).counts).toMatchObject({ warnings: 1, errors: 0 });
  });
});

describe('runImport: a row that fails (§ 8.6)', () => {
  it('goes on, and the job is completed all the same', async () => {
    const h = harness();
    h.stage(
      categoryFile(named('a'), named('b'), named('c'), named('d')),
      queued
    );
    h.services.failOn(
      (call) => call.input.url_key === 'b' || call.input.url_key === 'd',
      new Error('boom')
    );
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    const job = h.jobs.snapshot(1);
    expect(job.counts).toMatchObject({
      created: 2,
      failed: 2,
      skipped: 0,
      lastUnit: 4
    });
    expect(job.counts.byCode.import).toEqual({ WRITE_FAILED: 2 });
    expect(h.jobs.issues(1, 'import')).toMatchObject([
      { phase: 'import', rowNumber: 3, entityKey: 'b', code: 'WRITE_FAILED' },
      { phase: 'import', rowNumber: 5, entityKey: 'd', code: 'WRITE_FAILED' }
    ]);
  });

  it('stops at the tenth failed row, and says so (D-14)', async () => {
    const h = harness();
    h.stage(categoryFile(...keys(15).map((k) => named(k))), queued);
    h.services.failOn(() => true, new Error('boom'));
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('stopped');
    const job = h.jobs.snapshot(1);
    expect(job).toMatchObject({
      status: 'stopped',
      errorMessage: 'Stopped after 10 failed rows.',
      finishedAt: null,
      counts: { failed: 10, created: 0, lastUnit: 10 }
    });
    expect(h.services.calls).toHaveLength(10);
    expect(h.jobs.issues(1, 'import')).toHaveLength(10);
  });

  it('does not count skipped rows: they are consequences', async () => {
    const h = harness();
    h.stage(
      categoryFile(named('root'), ...keys(20).map((k) => named(k, 'root'))),
      queued
    );
    h.services.failOn(
      (call) => call.input.url_key === 'root',
      new Error('boom')
    );
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      failed: 1,
      skipped: 20,
      created: 0
    });
    expect(h.jobs.snapshot(1).counts.byCode.import).toEqual({
      WRITE_FAILED: 1,
      DEPENDENCY_FAILED: 20
    });
  });

  it('does not count a row that succeeds on a retry', async () => {
    const h = harness();
    h.stage(categoryFile(...keys(12).map((k) => named(k))), queued);
    // Every row fails once with a deadlock and succeeds on the retry.
    for (const k of keys(12)) {
      h.services.failOn(
        (call) => call.input.url_key === k,
        () => Object.assign(new Error('deadlock'), { code: '40P01' }),
        1
      );
    }
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ created: 12, failed: 0 });
    expect(h.clock.sleeps).toEqual(Array(12).fill(1000));
  });

  it('keeps at most maxIssues problems and counts them all', async () => {
    const h = harness({ config: { maxIssues: 2 } });
    h.stage(categoryFile(...keys(6).map((k) => named(k))), queued);
    h.services.failOn(() => true, new Error('boom'));
    await runImport(1, h.deps);
    const job = h.jobs.snapshot(1);
    expect(h.jobs.issues(1, 'import')).toHaveLength(2);
    expect(job.counts.byCode.import).toEqual({ WRITE_FAILED: 6 });
    expect(job.counts.issuesTruncated.import).toBe(true);
    // Rows 2 and 3 are listed; the first row whose problem is not is row 4.
    expect(job.counts.firstUnlistedRow).toEqual({ validate: null, import: 4 });
  });
});

describe('runImport: resume (§ 8.4)', () => {
  const FILE = () => categoryFile(...keys(14).map((k) => named(k)));

  async function stopped() {
    const h = harness();
    h.stage(FILE(), queued);
    // The first ten rows fail: a cause that is not fixed.
    h.services.failOn(
      (call) => keys(10).includes(call.input.url_key as string),
      new Error('disk full')
    );
    const first = await runImport(1, h.deps);
    expect(first.outcome).toBe('stopped');
    return h;
  }

  it('writes the rows that failed first and then the units after the last one saved', async () => {
    const h = await stopped();
    expect(h.lookup.stored.size).toBe(0);
    // The cause is fixed; the API puts the job back in the queue.
    h.services.calls.length = 0;
    h.services.clearFailures();
    h.jobs.setStatus(1, 'queued');
    const filesBefore = h.files.opened.get(1) as number;
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.lookup.stored.size).toBe(14);
    const job = h.jobs.snapshot(1);
    expect(job.counts).toMatchObject({
      created: 14,
      failed: 0,
      skipped: 0,
      lastUnit: 14
    });
    expect(job.attempt).toBe(2);
    // The old problems of the import are gone, and the limit of ten starts again.
    expect(h.jobs.issues(1, 'import')).toEqual([]);
    expect(job.counts.byCode.import).toEqual({});
    // A resumed job is not checked again: only the plan and the level.
    expect((h.files.opened.get(1) as number) - filesBefore).toBe(2);
    // Same order as a run that was never interrupted.
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(keys(14));
  });

  it('keeps the problem of a row that a resumed run did not get to, so the next resume still writes it', async () => {
    const h = await stopped();
    h.services.calls.length = 0;
    h.services.clearFailures();
    // The second run is stopped (a deploy) after it wrote the third row again.
    const controller = new AbortController();
    h.services.failOn((call) => {
      if (call.input.url_key === 'k02') controller.abort();
      return false;
    }, new Error('never'));
    h.jobs.setStatus(1, 'queued');
    const second = await runImport(1, h.deps, { signal: controller.signal });
    expect(second.outcome).toBe('interrupted');
    expect(h.lookup.stored.size).toBeGreaterThanOrEqual(3);
    expect(h.lookup.stored.size).toBeLessThan(10);
    // The rows it did not reach are still on the list of the rows to write again.
    const left = [...(await h.jobs.errorRows(1, 'import'))].sort(
      (a, b) => a - b
    );
    expect(left.length).toBe(10 - h.lookup.stored.size);
    // The third run writes every one of them, and the file in the end.
    h.services.calls.length = 0;
    h.jobs.setStatus(1, 'queued');
    const third = await runImport(1, h.deps);
    expect(third.outcome).toBe('completed');
    expect(h.lookup.stored.size).toBe(14);
    expect(h.jobs.issues(1, 'import')).toEqual([]);
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      failed: 0,
      lastUnit: 14
    });
  });

  it('stops again after ten failures when the cause is not fixed, not before', async () => {
    const h = await stopped();
    h.services.calls.length = 0;
    h.jobs.setStatus(1, 'queued');
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('stopped');
    // The ten rows that failed are tried again; the count of ten began again.
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(keys(10));
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      failed: 10,
      lastUnit: 10
    });
  });

  it('does not check the file again, and does not refuse a record that exists in mode create (IMP-07)', async () => {
    const h = harness();
    h.stage(FILE(), { ...queued, mode: 'create' });
    const controller = new AbortController();
    // Interrupted after the fifth row was written.
    h.services.failOn((call) => {
      if (call.input.url_key === 'k05') controller.abort();
      return false;
    }, new Error('never'));
    const first = await runImport(1, h.deps, { signal: controller.signal });
    expect(first.outcome).toBe('interrupted');
    const written = h.lookup.stored.size;
    expect(written).toBeGreaterThanOrEqual(5);
    // The last two seconds of progress were lost: the job remembers fewer units.
    const lost = h.jobs.snapshot(1).counts;
    h.jobs.setCounts(1, { ...lost, lastUnit: 2 });
    h.jobs.setStatus(1, 'queued');
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.lookup.stored.size).toBe(14);
    expect(h.jobs.issues(1, 'import')).toEqual([]);
    expect(h.jobs.snapshot(1).counts.updated).toBeGreaterThanOrEqual(1);
  });

  it('leaves the same store as a run that was never interrupted', async () => {
    const file = categoryFile(
      named('c', 'b'),
      named('b', 'a'),
      named('a'),
      named('d'),
      named('e', 'd')
    );
    const straight = harness();
    straight.stage(file, queued);
    await runImport(1, straight.deps);

    const h = harness();
    h.stage(file, queued);
    const controller = new AbortController();
    h.services.failOn((call) => {
      if (call.input.url_key === 'd') controller.abort();
      return false;
    }, new Error('never'));
    expect(
      (await runImport(1, h.deps, { signal: controller.signal })).outcome
    ).toBe('interrupted');
    h.jobs.setStatus(1, 'queued');
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(tree(h)).toEqual(tree(straight));
    expect(h.jobs.snapshot(1).counts.lastUnit).toBe(5);
  });
});

describe('runImport: cancel, SIGTERM and a job that is no longer ours', () => {
  const FILE = categoryFile(...keys(6).map((k) => named(k)));

  it('ends canceled when the admin cancels; what was written stays', async () => {
    const h = harness();
    h.stage(FILE, queued);
    // The row that takes the time lets the heartbeat tick and read the control.
    const original = h.services.createCategory.bind(h.services);
    h.services.createCategory = async (input) => {
      const made = await original(input);
      if (input.url_key === 'k02') {
        h.jobs.setControl(1, 'cancel');
        await h.clock.advance(2500);
      }
      return made;
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('canceled');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'canceled',
      control: null
    });
    expect(h.lookup.stored.size).toBe(3);
  });

  it('ends interrupted on SIGTERM, after the row it was writing, and can be resumed', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const controller = new AbortController();
    h.services.failOn((call) => {
      if (call.input.url_key === 'k01') controller.abort();
      return false;
    }, new Error('never'));
    const result = await runImport(1, h.deps, { signal: controller.signal });
    expect(result.outcome).toBe('interrupted');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'interrupted',
      errorMessage: 'The worker was stopped before it finished.',
      counts: { created: 2, lastUnit: 2 }
    });
  });

  it('stops before its next service call when the job is deleted', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const original = h.services.createCategory.bind(h.services);
    h.services.createCategory = async (input) => {
      const made = await original(input);
      if (input.url_key === 'k01') {
        h.jobs.delete(1);
        await h.clock.advance(2500);
      }
      return made;
    };
    const result = await runImport(1, h.deps);
    expect(result).toEqual({ outcome: 'lost' });
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual([
      'k00',
      'k01'
    ]);
    expect(h.logger.of('error')).toEqual([]);
  });

  it('stops before its next service call when the job was claimed again (a stale attempt)', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const original = h.services.createCategory.bind(h.services);
    h.services.createCategory = async (input) => {
      const made = await original(input);
      if (input.url_key === 'k02') {
        h.jobs.bumpAttempt(1);
        await h.clock.advance(2500);
      }
      return made;
    };
    const result = await runImport(1, h.deps);
    expect(result).toEqual({ outcome: 'lost' });
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual([
      'k00',
      'k01',
      'k02'
    ]);
    expect(h.jobs.snapshot(1)).toMatchObject({ status: 'running', attempt: 2 });
  });

  it('keeps the heartbeat going during a long row (a slow image)', async () => {
    const h = harness();
    h.stage(categoryFile(named('a'), named('b')), queued);
    const beats: Array<[number, number | null]> = [];
    const original = h.services.createCategory.bind(h.services);
    h.services.createCategory = async (input) => {
      if (input.url_key === 'b') {
        await h.clock.advance(5000);
        beats.push([
          h.jobs.snapshot(1).counts.created,
          h.jobs.snapshot(1).heartbeatAt
        ]);
      }
      return original(input);
    };
    const started = h.clock.now();
    await runImport(1, h.deps);
    // While row b took five seconds, the job showed row a, and was alive.
    expect(beats).toEqual([[1, started + 4000]]);
  });

  it('does nothing for a job that is not queued', async () => {
    const h = harness();
    h.stage(FILE, { status: 'running', attempt: 1 });
    expect(await runImport(1, h.deps)).toEqual({ outcome: 'not_claimed' });
    expect(h.services.calls).toEqual([]);
  });
});

describe('runImport: when it cannot run', () => {
  it('fails the job for an entity it cannot import yet', async () => {
    const h = harness();
    // Every entity has a pipeline now; a job of any other kind is refused.
    h.stage('email\na@b.com\n', { ...queued, entity: 'coupon' as never });
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('failed');
    expect(h.jobs.snapshot(1).errorMessage).toBe(
      'A coupon file cannot be imported yet.'
    );
  });

  it('fails the job when the staged file is damaged (J1)', async () => {
    const h = harness();
    h.stage(categoryFile(named('a')), queued);
    h.files.damage(1, 'flip-byte');
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('failed');
    expect(h.jobs.snapshot(1).errorMessage).toBe(
      'The uploaded file is damaged. Upload it again.'
    );
    expect(h.services.calls).toEqual([]);
  });

  it('fails a resumed job whose file is damaged, before it writes anything', async () => {
    const h = harness();
    h.stage(categoryFile(named('a')), {
      ...queued,
      startedAt: 1,
      counts: { ...emptyCounts(), lastUnit: 0 }
    });
    h.files.damage(1, 'drop-chunk');
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('failed');
    expect(h.services.calls).toEqual([]);
  });

  it('interrupts the job, so that it can be resumed, when the database fails for a moment outside a row (D-20)', async () => {
    const h = harness();
    h.stage(categoryFile(named('a'), named('b')), queued);
    const reads = h.deps.lookup.categories.bind(h.deps.lookup);
    let broken = true;
    h.deps.lookup.categories = async (keys) => {
      if (broken) {
        throw Object.assign(new Error('terminating connection'), {
          code: '57P01'
        });
      }
      return reads(keys);
    };
    const first = await runImport(1, h.deps);
    expect(first.outcome).toBe('interrupted');
    expect(h.jobs.snapshot(1).status).toBe('interrupted');
    expect(h.jobs.snapshot(1).errorMessage).toContain('Resume it');
    broken = false;
    h.jobs.setStatus(1, 'queued');
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.lookup.stored.size).toBe(2);
  });

  it('fails the job, with the reason, when the engine breaks (J3)', async () => {
    const h = harness();
    h.stage(categoryFile(named('a')), queued);
    h.deps.lookup.categories = async () => {
      throw new Error('connection terminated');
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('failed');
    expect(h.jobs.snapshot(1).errorMessage).toContain('connection terminated');
    expect(h.logger.of('error')).toHaveLength(1);
    expect(h.clock.running).toBe(0);
  });
});

describe('runImport: more about the check at the start and about resuming', () => {
  it('shows the stage: rechecking, then writing', async () => {
    const h = harness();
    h.stage(categoryFile(named('a'), named('b')), queued);
    const stages: Array<string | null> = [];
    class Spy extends MemoryLookup {
      async categories(keys: readonly string[]) {
        await h.clock.advance(2500);
        stages.push(h.jobs.snapshot(1).stage);
        return super.categories(keys);
      }
    }
    h.deps.lookup = new Spy();
    await runImport(1, h.deps);
    // The check asks the store once; the writer asks again for its batch.
    expect(stages).toEqual(['rechecking', 'writing']);
    expect(h.jobs.snapshot(1).stage).toBeNull();
  });

  it('does not mark the job as started when it is canceled during the check', async () => {
    const h = harness();
    h.stage(categoryFile(named('a'), named('b')), queued);
    class Slow extends MemoryLookup {
      async categories(keys: readonly string[]) {
        h.jobs.setControl(1, 'cancel');
        await h.clock.advance(2500);
        return super.categories(keys);
      }
    }
    h.deps.lookup = new Slow();
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('canceled');
    expect(h.jobs.snapshot(1).startedAt).toBeNull();
    expect(h.services.calls).toEqual([]);
  });

  it('does not write again the units that were saved', async () => {
    const h = harness();
    h.stage(categoryFile(...keys(8).map((k) => named(k))), queued);
    const controller = new AbortController();
    h.services.failOn((call) => {
      if (call.input.url_key === 'k03') controller.abort();
      return false;
    }, new Error('never'));
    expect(
      (await runImport(1, h.deps, { signal: controller.signal })).outcome
    ).toBe('interrupted');
    expect(h.jobs.snapshot(1).counts.lastUnit).toBe(4);
    h.services.calls.length = 0;
    h.jobs.setStatus(1, 'queued');
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual([
      'k04',
      'k05',
      'k06',
      'k07'
    ]);
  });

  it('resets the count of skipped rows when it tries them again', async () => {
    const h = harness();
    // root fails, and its three children are skipped; then ten more rows fail
    // and the import stops.
    h.stage(
      categoryFile(
        named('root'),
        named('ok'),
        named('kid-a', 'root'),
        named('kid-b', 'root'),
        named('kid-c', 'root'),
        ...keys(10, 'x').map((k) => named(k, 'ok'))
      ),
      queued
    );
    h.services.failOn(
      (call) =>
        call.input.url_key === 'root' ||
        String(call.input.url_key).startsWith('x'),
      new Error('boom')
    );
    expect((await runImport(1, h.deps)).outcome).toBe('stopped');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ skipped: 3 });
    h.services.clearFailures();
    h.jobs.setStatus(1, 'queued');
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ failed: 0, skipped: 0 });
    expect(h.lookup.stored.size).toBe(2 + 3 + 10);
  });

  it('never takes lastUnit back when it tries a few rows again', async () => {
    const h = harness();
    h.stage(categoryFile(...keys(5).map((k) => named(k))), queued);
    h.services.failOn(
      (call) => call.input.url_key === 'k01',
      new Error('boom'),
      1
    );
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ failed: 1, lastUnit: 5 });
    // The job is put back in the queue and only the failed row is written again.
    h.jobs.setStatus(1, 'queued');
    h.services.calls.length = 0;
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    expect(h.services.calls.map((c) => c.input.url_key)).toEqual(['k01']);
    expect(h.jobs.snapshot(1).counts).toMatchObject({ failed: 0, lastUnit: 5 });
  });

  it('leaves the cap flag of the check alone when it does not check again', async () => {
    const h = harness();
    h.stage(categoryFile(named('a')), {
      ...queued,
      startedAt: 1,
      counts: {
        ...emptyCounts(),
        issuesTruncated: { validate: true, import: false },
        firstUnlistedRow: { validate: 8, import: null }
      }
    });
    await runImport(1, h.deps);
    expect(h.jobs.snapshot(1).counts.issuesTruncated).toEqual({
      validate: true,
      import: false
    });
    expect(h.jobs.snapshot(1).counts.firstUnlistedRow).toEqual({
      validate: 8,
      import: null
    });
  });
});
