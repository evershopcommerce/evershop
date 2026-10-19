import { describe, it, expect } from '@jest/globals';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { emptyCounts } from '../../../services/job/types.js';
import { runValidation } from '../../../services/runner/index.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { harness } from '../helpers/harness.js';

const named = (url_key: string, parent = '', more = {}) =>
  categoryRow({ url_key, name: url_key.toUpperCase(), parent, ...more });

const GOOD = categoryFile(named('a'), named('b', 'a'), named('c'));

describe('runValidation: a file with no problems', () => {
  it('claims the job, checks the file and leaves it validated', async () => {
    const h = harness();
    h.stage(GOOD);
    const result = await runValidation(1, h.deps, { worker: 'host:7' });
    expect(result.outcome).toBe('validated');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validated',
      attempt: 1,
      worker: 'host:7',
      stage: null,
      errorMessage: null,
      counts: { total: 3, createRows: 3, updateRows: 0, errors: 0, warnings: 0 }
    });
    expect(h.jobs.snapshot(1).expiresAt).not.toBeNull();
    expect(h.jobs.issues(1)).toEqual([]);
  });

  it('reads the file twice, writes nothing but the job, and stops its timer', async () => {
    const h = harness();
    h.stage(GOOD);
    await runValidation(1, h.deps);
    expect(h.files.opened.get(1)).toBe(2);
    expect(h.services.calls).toEqual([]);
    expect(h.lookup.stored.size).toBe(0);
    expect(h.clock.running).toBe(0);
  });

  it('counts the rows that would update', async () => {
    const h = harness({
      store: { categories: [{ urlKey: 'a' }, { urlKey: 'c' }] }
    });
    h.stage(GOOD);
    await runValidation(1, h.deps);
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      createRows: 1,
      updateRows: 2
    });
  });
});

describe('runValidation: a file with problems', () => {
  const BAD = categoryFile(
    named('a'),
    named('b', 'ghost'),
    named('c', '', { status: '9' }),
    named('a'),
    'x,y'
  );

  it('is validated all the same, with the problems and their totals', async () => {
    const h = harness();
    h.stage(BAD);
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('validated');
    const job = h.jobs.snapshot(1);
    expect(job.status).toBe('validated');
    expect(job.counts.errors).toBe(4);
    expect(job.counts.byCode.validate).toEqual({
      ROW_WIDTH: 1,
      INVALID_VALUE: 1,
      DUPLICATE_KEY_IN_FILE: 1,
      REFERENCE_NOT_FOUND: 1
    });
    expect(
      h.jobs
        .issues(1, 'validate')
        .map((i) => [i.rowNumber, i.code, i.entityKey])
    ).toEqual(
      expect.arrayContaining([
        [3, 'REFERENCE_NOT_FOUND', 'b'],
        [4, 'INVALID_VALUE', 'c'],
        [5, 'DUPLICATE_KEY_IN_FILE', 'a'],
        [6, 'ROW_WIDTH', null]
      ])
    );
  });

  it('stores a problem with its column, its params, its message and its value', async () => {
    const h = harness();
    h.stage(categoryFile(named('c', '', { status: '9' })));
    await runValidation(1, h.deps);
    expect(h.jobs.issues(1)).toMatchObject([
      {
        phase: 'validate',
        rowNumber: 2,
        entityKey: 'c',
        column: 'status',
        code: 'INVALID_VALUE',
        severity: 'error',
        params: { reason: 'not_boolean' },
        value: '9'
      }
    ]);
  });

  it('keeps a problem with the file, which has no row', async () => {
    const h = harness();
    h.stage('name,status\nWomen,1\n');
    await runValidation(1, h.deps);
    expect(h.jobs.issues(1)).toMatchObject([
      {
        rowNumber: null,
        entityKey: null,
        code: 'MISSING_COLUMN',
        column: 'url_key'
      }
    ]);
    expect(h.jobs.snapshot(1).status).toBe('validated');
  });

  it('counts warnings apart', async () => {
    const h = harness();
    h.stage('url_key,name,status,colour\nwomen,Women,1,red\n');
    await runValidation(1, h.deps);
    expect(h.jobs.snapshot(1).counts).toMatchObject({ errors: 0, warnings: 1 });
  });

  it('keeps at most maxIssues of them and counts all (§ 8.4)', async () => {
    const h = harness({ config: { maxIssues: 3 } });
    h.stage(
      categoryFile(
        ...Array.from({ length: 10 }, (_, n) =>
          named(`k${n}`, '', { status: 'x' })
        )
      )
    );
    await runValidation(1, h.deps);
    const job = h.jobs.snapshot(1);
    expect(h.jobs.issues(1)).toHaveLength(3);
    expect(job.counts.errors).toBe(10);
    expect(job.counts.byCode.validate).toEqual({ INVALID_VALUE: 10 });
    expect(job.counts.issuesTruncated).toEqual({
      validate: true,
      import: false
    });
    // The file has its header on row 1: the stored problems are rows 2 to 4.
    expect(job.counts.firstUnlistedRow).toEqual({ validate: 5, import: null });
  });

  it('begins from row 1 again: the problems and totals of an earlier check are gone', async () => {
    const h = harness();
    h.stage(categoryFile(named('a', '', { status: '9' })), {
      counts: {
        ...emptyCounts(),
        errors: 7,
        created: 4,
        byCode: { validate: { OLD: 7 }, import: { WRITE_FAILED: 2 } },
        issuesTruncated: { validate: true, import: false },
        firstUnlistedRow: { validate: 7, import: 20 }
      }
    });
    h.jobs.seedIssues(1, [
      {
        phase: 'validate',
        rowNumber: 9,
        entityKey: 'old',
        column: null,
        code: 'OLD',
        severity: 'error',
        params: {},
        message: 'm',
        value: null
      }
    ]);
    await runValidation(1, h.deps);
    const job = h.jobs.snapshot(1);
    expect(job.counts.errors).toBe(1);
    expect(job.counts.byCode.validate).toEqual({ INVALID_VALUE: 1 });
    expect(job.counts.issuesTruncated.validate).toBe(false);
    expect(job.counts.firstUnlistedRow).toEqual({ validate: null, import: 20 });
    expect(h.jobs.issues(1).map((i) => i.code)).toEqual(['INVALID_VALUE']);
    // What belongs to the import is not touched by a check.
    expect(job.counts.created).toBe(4);
    expect(job.counts.byCode.import).toEqual({ WRITE_FAILED: 2 });
  });
});

describe('runValidation: when it cannot run', () => {
  it('does nothing for a job that someone else has claimed', async () => {
    const h = harness();
    h.stage(GOOD, { status: 'validating', attempt: 1 });
    const result = await runValidation(1, h.deps);
    expect(result).toEqual({ outcome: 'not_claimed' });
    expect(h.files.opened.size).toBe(0);
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validating',
      attempt: 1
    });
  });

  it('does nothing for a job that is gone', async () => {
    const h = harness();
    expect(await runValidation(5, h.deps)).toEqual({ outcome: 'not_claimed' });
  });

  it.each([
    ['a chunk is missing', 'drop-chunk' as const],
    ['a byte has changed', 'flip-byte' as const]
  ])(
    'fails the job when the staged file is damaged: %s (J1)',
    async (_name, how) => {
      const h = harness();
      h.stage(GOOD);
      h.files.damage(1, how);
      const result = await runValidation(1, h.deps);
      expect(result.outcome).toBe('failed');
      expect(h.jobs.snapshot(1)).toMatchObject({
        status: 'failed',
        errorMessage: 'The uploaded file is damaged. Upload it again.'
      });
      expect(h.jobs.snapshot(1).finishedAt).not.toBeNull();
    }
  );

  it('fails the job when there is no staged file', async () => {
    const h = harness();
    h.jobs.insert({ id: 1 });
    expect((await runValidation(1, h.deps)).outcome).toBe('failed');
  });

  it('fails the job for an entity it cannot check yet', async () => {
    const h = harness();
    h.stage(GOOD, { entity: 'customer' });
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('failed');
    expect(h.jobs.snapshot(1).errorMessage).toBe(
      'A customer file cannot be checked yet.'
    );
  });

  it('fails the job, with the reason, when the engine breaks (J3)', async () => {
    const h = harness();
    h.stage(GOOD);
    h.deps.lookup = Object.assign(new MemoryLookup(), {
      categories: async () => {
        throw new Error('relation "category" does not exist');
      }
    });
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('failed');
    expect(h.jobs.snapshot(1).errorMessage).toBe(
      'The import stopped because of an error: relation "category" does not exist'
    );
    expect(h.logger.of('error')).toHaveLength(1);
    expect(h.clock.running).toBe(0);
  });
});
