import { createHash } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { nodeSha256 } from '../../../adapters/nodeSha256.js';
import { API_STATUS, ImportApiError } from '../../../services/jobs/errors.js';
import {
  ImportService,
  cleanFileName
} from '../../../services/jobs/ImportService.js';
import type { ImportServiceDeps } from '../../../services/jobs/ImportService.js';
import { emptyCounts } from '../../../services/job/types.js';
import type { StoredIssue } from '../../../services/job/types.js';
import type { JobAdmin } from '../../../services/ports/jobAdmin.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { MemoryJobStore } from '../../../testing/MemoryJobStore.js';

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function setup(
  options: Partial<ImportServiceDeps> = {},
  wrap: (store: MemoryJobStore) => JobAdmin = (store) => store
) {
  const store = new MemoryJobStore(new FakeClock());
  const service = new ImportService({
    jobs: wrap(store),
    sha256: nodeSha256,
    maxFileBytes: 1_000_000,
    chunkBytes: 8,
    ...options
  });
  return { store, service };
}

async function* split(bytes: Buffer, size: number) {
  for (let at = 0; at < bytes.length; at += size) {
    yield bytes.subarray(at, at + size);
  }
}

const upload = (
  service: ImportService,
  bytes: Buffer,
  more: Partial<Parameters<ImportService['upload']>[0]> = {}
) =>
  service.upload({
    entity: 'category',
    fileName: 'categories.csv',
    createdBy: 7,
    file: split(bytes, 5),
    ...more
  });

async function refusal(work: Promise<unknown>): Promise<ImportApiError> {
  try {
    await work;
  } catch (e) {
    expect(e).toBeInstanceOf(ImportApiError);
    return e as ImportApiError;
  }
  throw new Error('Expected the request to be refused');
}

const FILE = Buffer.from('url_key,name\nwomen,Women\nmen,Men\n');

describe('ImportService.upload: the file arrives whole, in chunks', () => {
  it('stores the file in chunks, records its size, count and SHA-256, and makes the job uploaded', async () => {
    const { store, service } = setup();
    const { job, replaced } = await upload(service, FILE, {
      mode: 'create',
      checkImages: true
    });
    expect(replaced).toBe(false);
    expect(job).toMatchObject({
      entity: 'category',
      mode: 'create',
      status: 'uploaded',
      options: { checkImages: true },
      fileName: 'categories.csv',
      fileSize: FILE.length,
      chunkCount: Math.ceil(FILE.length / 8),
      fileSha256: sha(FILE),
      createdBy: 7
    });
    const chunks = store.chunksOf(job.id);
    expect(chunks.slice(0, -1).every((c) => c.length === 8)).toBe(true);
    expect(Buffer.concat(chunks).equals(FILE)).toBe(true);
  });

  it('gives the same job whatever the pieces of the stream are', async () => {
    for (const size of [1, 3, 8, 9, 1000]) {
      const { store, service } = setup();
      // eslint-disable-next-line no-await-in-loop
      const { job } = await upload(service, FILE, { file: split(FILE, size) });
      expect(job.fileSha256).toBe(sha(FILE));
      expect(Buffer.concat(store.chunksOf(job.id)).equals(FILE)).toBe(true);
    }
  });

  it('stores an empty file as no chunk', async () => {
    const { store, service } = setup();
    const { job } = await upload(service, Buffer.alloc(0));
    expect(job).toMatchObject({
      status: 'uploaded',
      fileSize: 0,
      chunkCount: 0,
      fileSha256: sha(Buffer.alloc(0))
    });
    expect(store.chunksOf(job.id)).toEqual([]);
  });

  it('defaults to upsert and no image check, and cleans the file name', async () => {
    const { service } = setup();
    const { job } = await upload(service, FILE, {
      fileName: 'C:\\Users\\jane\\Desktop\\my\ncats.csv'
    });
    expect(job).toMatchObject({
      mode: 'upsert',
      options: { checkImages: false },
      fileName: 'my cats.csv'
    });
  });

  it('replaces the unstarted job of the entity when the new file has arrived whole, and says so', async () => {
    const { store, service } = setup();
    const old = store.insert({ status: 'validated' });
    const during: Array<string | undefined> = [];
    async function* watched() {
      yield FILE.subarray(0, 10);
      // The old job is still there while the new file streams in.
      during.push(store.snapshot(old.id).status);
      yield FILE.subarray(10);
    }
    const { job, replaced } = await upload(service, FILE, { file: watched() });
    expect(during).toEqual(['validated']);
    expect(replaced).toBe(true);
    expect(await store.get(old.id)).toBeNull();
    expect((await service.listOpen()).map((j) => j.id)).toEqual([job.id]);
  });

  it('refuses at once when the entity import is busy, before it reads a byte', async () => {
    const { store, service } = setup();
    store.insert({ entity: 'category', status: 'running' });
    let pulled = 0;
    async function* source() {
      pulled += 1;
      yield FILE;
    }
    const error = await refusal(upload(service, FILE, { file: source() }));
    expect(error).toMatchObject({
      code: 'IMPORT_RUNNING',
      status: 409,
      details: { entity: 'category' }
    });
    expect(pulled).toBe(0);
    expect((await service.listOpen()).map((j) => j.status)).toEqual([
      'running'
    ]);
  });

  it('refuses when the import became busy while the file arrived, and leaves nothing behind', async () => {
    const { store, service } = setup();
    async function* busyAtTheEnd() {
      yield FILE;
      store.insert({ entity: 'category', status: 'running' });
    }
    const error = await refusal(
      upload(service, FILE, { file: busyAtTheEnd() })
    );
    expect(error.code).toBe('IMPORT_RUNNING');
    const left = await service.listOpen();
    expect(left.map((j) => j.status)).toEqual(['running']);
  });

  it('stops a file that is too large while it streams, and leaves nothing behind', async () => {
    const { store, service } = setup({ maxFileBytes: 20 });
    let pulled = 0;
    async function* endless() {
      for (;;) {
        pulled += 1;
        yield Buffer.alloc(5, 1);
      }
    }
    const error = await refusal(upload(service, FILE, { file: endless() }));
    expect(error).toMatchObject({ code: 'FILE_TOO_LARGE', status: 413 });
    expect(pulled).toBe(5);
    expect(await store.get(1)).toBeNull();
    expect(store.chunksOf(1)).toEqual([]);
  });

  it('accepts a file of exactly the largest size', async () => {
    const { service } = setup({ maxFileBytes: FILE.length });
    const { job } = await upload(service, FILE);
    expect(job.status).toBe('uploaded');
  });

  it('deletes the job when the stream fails half way (the browser went away)', async () => {
    const { store, service } = setup();
    async function* dropped() {
      yield FILE.subarray(0, 20);
      throw new Error('socket hang up');
    }
    await expect(upload(service, FILE, { file: dropped() })).rejects.toThrow(
      'socket hang up'
    );
    expect(await store.get(1)).toBeNull();
    expect(store.chunksOf(1)).toEqual([]);
  });

  it('stops when the job was deleted under it (the cleanup took a stale upload)', async () => {
    const { store, service } = setup();
    async function* watched() {
      yield FILE.subarray(0, 10);
      store.delete(1);
      yield FILE.subarray(10);
    }
    const error = await refusal(upload(service, FILE, { file: watched() }));
    expect(error.code).toBe('NOT_FOUND');
  });

  it('leaves the job it replaced alone when the upload fails', async () => {
    const { store, service } = setup();
    const old = store.insert({ status: 'validated' });
    async function* dropped() {
      yield FILE;
      throw new Error('reset');
    }
    await expect(upload(service, FILE, { file: dropped() })).rejects.toThrow(
      'reset'
    );
    expect(store.snapshot(old.id).status).toBe('validated');
  });

  it.each([
    [{ entity: 'order' }, 'entity'],
    [{ entity: undefined }, 'entity'],
    [{ entity: '__proto__' }, 'entity'],
    [{ entity: 'toString' }, 'entity'],
    [{ mode: 'merge' }, 'mode'],
    [{ checkImages: 'maybe' }, 'checkImages']
  ])('refuses a request with %j, and creates nothing', async (bad, field) => {
    const { store, service } = setup();
    const error = await refusal(upload(service, FILE, bad));
    expect(error).toMatchObject({ code: 'INVALID_REQUEST', status: 400 });
    expect(error.message).toContain(field);
    expect(await store.get(1)).toBeNull();
  });

  it.each([
    ['true', true],
    [true, true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['', false],
    [undefined, false]
  ])('reads checkImages %j as %s', async (value, expected) => {
    const { service } = setup();
    const { job } = await upload(service, FILE, { checkImages: value });
    expect(job.options.checkImages).toBe(expected);
  });
});

describe('cleanFileName', () => {
  it.each([
    ['categories.csv', 'categories.csv'],
    ['/etc/passwd', 'passwd'],
    ['..\\..\\secret.csv', 'secret.csv'],
    ['a/b/c.csv', 'c.csv'],
    ['two\nlines\tand\u0000nul.csv', 'two lines and nul.csv'],
    ['  padded.csv  ', 'padded.csv'],
    ['', 'upload.csv'],
    ['dir/', 'upload.csv'],
    [undefined, 'upload.csv'],
    [42, 'upload.csv'],
    ['é日本語.csv', 'é日本語.csv']
  ])('%j becomes %j', (given, expected) => {
    expect(cleanFileName(given)).toBe(expected);
  });

  it('keeps at most 200 characters', () => {
    expect(cleanFileName(`${'a'.repeat(500)}.csv`)).toHaveLength(200);
  });
});

describe('ImportService: the actions', () => {
  it('starts, cancels, resumes, rechecks and deletes, and gives the job back', async () => {
    const { store, service } = setup();
    const validated = store.insert({ status: 'validated' });
    expect((await service.start(validated.id)).status).toBe('queued');
    expect(await service.cancel(validated.id)).toMatchObject({
      how: 'canceled',
      job: { status: 'canceled' }
    });
    const running = store.insert({ entity: 'product', status: 'running' });
    expect(await service.cancel(running.id)).toMatchObject({
      how: 'requested'
    });
    const stopped = store.insert({
      entity: 'customer',
      status: 'stopped',
      startedAt: 5
    });
    store.setStatus(running.id, 'completed');
    expect((await service.resume(stopped.id)).status).toBe('queued');
    const again = store.insert({
      entity: 'customerAddress',
      status: 'validated'
    });
    expect((await service.recheck(again.id)).status).toBe('uploaded');
    expect((await service.remove(again.id)).id).toBe(again.id);
    expect(await store.get(again.id)).toBeNull();
  });

  it('says why it refuses, with the code and the HTTP status of §8.3', async () => {
    const { store, service } = setup();
    const gone = await refusal(service.start(99));
    expect(gone).toMatchObject({ code: 'NOT_FOUND', status: 404 });

    const wrong = await refusal(
      service.start(store.insert({ status: 'completed' }).id)
    );
    expect(wrong).toMatchObject({
      code: 'WRONG_STATUS',
      status: 409,
      details: { status: 'completed' }
    });

    const errors = store.insert({
      entity: 'product',
      status: 'validated',
      counts: { ...emptyCounts(), errors: 2 }
    });
    expect(await refusal(service.start(errors.id))).toMatchObject({
      code: 'FILE_HAS_ERRORS',
      status: 409
    });

    store.insert({ entity: 'customer', status: 'running' });
    const clean = store.insert({
      entity: 'customerAddress',
      status: 'validated'
    });
    expect(await refusal(service.start(clean.id))).toMatchObject({
      code: 'IMPORT_ALREADY_RUNNING',
      status: 409,
      details: { entity: 'customer' }
    });

    const stopped = store.insert({
      entity: 'category',
      status: 'stopped',
      startedAt: 5
    });
    store.insert({ entity: 'category', status: 'validated' });
    expect(await refusal(service.resume(stopped.id))).toMatchObject({
      code: 'OPEN_JOB_EXISTS',
      status: 409
    });
    expect(await refusal(service.recheck(99))).toMatchObject({
      code: 'NOT_FOUND'
    });
    expect(await refusal(service.cancel(99))).toMatchObject({
      code: 'NOT_FOUND'
    });
    expect(await refusal(service.remove(99))).toMatchObject({
      code: 'NOT_FOUND'
    });
    const active = store.insert({ entity: 'product', status: 'validating' });
    expect(await refusal(service.remove(active.id))).toMatchObject({
      code: 'WRONG_STATUS',
      details: { status: 'validating' }
    });
  });

  it('gives a job, or says there is none', async () => {
    const { store, service } = setup();
    const job = store.insert({ status: 'validated' });
    expect((await service.get(job.id)).id).toBe(job.id);
    expect(await refusal(service.get(99))).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('has an HTTP status for every code', () => {
    expect(API_STATUS).toEqual({
      INVALID_REQUEST: 400,
      NOT_FOUND: 404,
      WRONG_STATUS: 409,
      IMPORT_RUNNING: 409,
      IMPORT_ALREADY_RUNNING: 409,
      OPEN_JOB_EXISTS: 409,
      FILE_HAS_ERRORS: 409,
      FILE_TOO_LARGE: 413
    });
  });
});

describe('ImportService.issues: the problems table', () => {
  const stored = (
    row: number | null,
    more: Partial<StoredIssue> = {}
  ): StoredIssue => ({
    phase: 'validate',
    rowNumber: row,
    entityKey: 'k',
    column: 'status',
    code: 'INVALID_VALUE',
    severity: 'error',
    params: { reason: 'x' },
    message: `English ${row}`,
    value: null,
    ...more
  });

  const seeded = () => {
    const ctx = setup();
    const job = ctx.store.insert({
      status: 'validated',
      counts: {
        ...emptyCounts(),
        byCode: {
          validate: { INVALID_VALUE: 120 },
          import: { WRITE_FAILED: 3 }
        },
        issuesTruncated: { validate: true, import: false }
      }
    });
    ctx.store.seedIssues(
      job.id,
      Array.from({ length: 120 }, (_, n) => stored(n + 2))
    );
    ctx.store.seedIssues(job.id, [
      stored(4, {
        phase: 'import',
        code: 'WRITE_FAILED',
        message: 'import four'
      })
    ]);
    return { ...ctx, job };
  };

  it('gives the first page of the phase, the total, and the totals per code', async () => {
    const { service, job } = seeded();
    const view = await service.issues(job.id);
    expect(view).toMatchObject({
      phase: 'validate',
      page: 1,
      limit: 50,
      total: 120,
      byCode: { INVALID_VALUE: 120 },
      truncated: true
    });
    expect(view.items).toHaveLength(50);
    expect(view.items[0].rowNumber).toBe(2);
    expect(view.job.id).toBe(job.id);
  });

  it('gives the page asked for, and a short last page', async () => {
    const { service, job } = seeded();
    const last = await service.issues(job.id, { page: '3', limit: '50' });
    expect(last.items).toHaveLength(20);
    expect(last.items[0].rowNumber).toBe(102);
    expect(last.page).toBe(3);
  });

  it('shows the import phase once the job has written something', async () => {
    const { service, store, job } = seeded();
    store.live(job.id).startedAt = 5;
    const view = await service.issues(job.id);
    expect(view).toMatchObject({
      phase: 'import',
      total: 1,
      byCode: { WRITE_FAILED: 3 },
      truncated: false
    });
    // Unless the admin asks for the check's table.
    expect((await service.issues(job.id, { phase: 'validate' })).total).toBe(
      120
    );
  });

  it('renders the message in the language of the admin from the code and the parameters', async () => {
    const { service, job } = seeded();
    const rendered = new ImportService({
      jobs: (service as unknown as { deps: ImportServiceDeps }).deps.jobs,
      sha256: nodeSha256,
      maxFileBytes: 1,
      render: (issue) => `[vi] ${issue.code} ${JSON.stringify(issue.params)}`
    });
    const view = await rendered.issues(job.id, { limit: 1 });
    expect(view.items[0].message).toBe('[vi] INVALID_VALUE {"reason":"x"}');
  });

  it('filters', async () => {
    const { service, store, job } = seeded();
    store.seedIssues(job.id, [
      stored(300, {
        severity: 'warning',
        code: 'UNKNOWN_COLUMN',
        column: 'colour'
      })
    ]);
    expect((await service.issues(job.id, { severity: 'warning' })).total).toBe(
      1
    );
    expect(
      (await service.issues(job.id, { code: 'UNKNOWN_COLUMN' })).items[0]
        .rowNumber
    ).toBe(300);
    expect((await service.issues(job.id, { column: 'colour' })).total).toBe(1);
  });

  it.each([
    [{ phase: 'later' }, 'phase'],
    [{ severity: 'fatal' }, 'severity'],
    [{ page: '0' }, 'page'],
    [{ page: 'x' }, 'page'],
    [{ page: 1.5 }, 'page'],
    [{ limit: '0' }, 'limit'],
    [{ limit: '201' }, 'limit'],
    [{ code: 5 }, 'code']
  ])('refuses %j', async (bad, field) => {
    const { service, job } = seeded();
    const error = await refusal(service.issues(job.id, bad));
    expect(error).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(error.message).toContain(field);
  });

  it('says there is no such job', async () => {
    const { service } = setup();
    expect(await refusal(service.issues(99))).toMatchObject({
      code: 'NOT_FOUND'
    });
  });
});
