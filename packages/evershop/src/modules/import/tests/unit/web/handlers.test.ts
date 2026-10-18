import { describe, it, expect } from '@jest/globals';
import { emptyCounts } from '../../../services/job/types.js';
import type { StoredIssue } from '../../../services/job/types.js';
import {
  cancelJob,
  contentDisposition,
  deleteJob,
  downloadFileWithErrors,
  getIssues,
  getJob,
  listOpenJobs,
  recheckJob,
  resumeJob,
  startJob
} from '../../../web/handlers.js';
import { bodyOf, makeWeb, textOf } from '../helpers/webHarness.js';

const BOM = '﻿';

const issue = (
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
  value: 'bad',
  ...more
});

describe('getJob: a job as the API shows it', () => {
  it('shows what the page needs, with the uuid as its name and the admin by name', async () => {
    const { web, store } = makeWeb();
    const job = store.insert({
      status: 'validated',
      createdBy: 7,
      fileName: 'products.csv',
      fileSize: 1234,
      stage: 'reading',
      control: 'cancel',
      validatedAt: 1_760_000_000_000,
      waitingSince: 1_760_000_100_000,
      attempt: 3,
      worker: 'host:9',
      fileSha256: 'a'.repeat(64),
      chunkCount: 2,
      counts: { ...emptyCounts(), total: 5 }
    });
    const result = await getJob(web, job.uuid);
    expect(result).toMatchObject({ kind: 'json', status: 200 });
    const { data } = bodyOf(result);
    expect(data).toMatchObject({
      uuid: job.uuid,
      entity: 'category',
      mode: 'upsert',
      status: 'validated',
      stage: 'reading',
      cancelRequested: true,
      fileName: 'products.csv',
      fileSize: 1234,
      counts: { total: 5 },
      validatedAt: '2025-10-09T08:53:20.000Z',
      waitingSince: '2025-10-09T08:55:00.000Z',
      startedAt: null,
      createdBy: { id: 7, name: 'Jane Doe' }
    });
    expect(typeof data.createdAt).toBe('string');
  });

  it('keeps the insides inside: no numeric id, fencing token, worker, hash or chunk count', async () => {
    const { web, store } = makeWeb();
    const job = store.insert({
      worker: 'host:9',
      attempt: 3,
      fileSha256: 'a'.repeat(64),
      chunkCount: 2
    });
    const { data } = bodyOf(await getJob(web, job.uuid));
    for (const secret of [
      'id',
      'attempt',
      'worker',
      'fileSha256',
      'chunkCount',
      'control'
    ]) {
      expect(data).not.toHaveProperty(secret);
    }
    expect(JSON.stringify(data)).not.toContain('host:9');
  });

  it('says that a cancel was not asked for when none was', async () => {
    const { web, store } = makeWeb();
    const job = store.insert({ control: null });
    expect(bodyOf(await getJob(web, job.uuid)).data.cancelRequested).toBe(
      false
    );
  });

  it('asks for the names of the admins who uploaded, each once, and for nobody when nobody did', async () => {
    const { web, store } = makeWeb();
    const asked: number[][] = [];
    const names = web.adminNames;
    web.adminNames = async (ids) => {
      asked.push([...ids]);
      return names(ids);
    };
    store.insert({ entity: 'category', status: 'validated', createdBy: 7 });
    store.insert({ entity: 'product', status: 'validated', createdBy: 7 });
    store.insert({ entity: 'customer', status: 'validated', createdBy: null });
    await listOpenJobs(web);
    expect(asked).toEqual([[7]]);
    asked.length = 0;
    const loner = makeWeb();
    const own = loner.web.adminNames;
    loner.web.adminNames = async (ids) => {
      asked.push([...ids]);
      return own(ids);
    };
    const anonymous = loner.store.insert({ createdBy: null });
    await getJob(loner.web, anonymous.uuid);
    expect(asked).toEqual([]);
  });

  it('shows a job nobody uploaded as made by no one', async () => {
    const { web, store } = makeWeb();
    const job = store.insert({ createdBy: null });
    expect(bodyOf(await getJob(web, job.uuid)).data.createdBy).toBeNull();
  });

  it('shows an admin who has gone as an id with no name', async () => {
    const { web, store } = makeWeb();
    const job = store.insert({ createdBy: 99 });
    expect(bodyOf(await getJob(web, job.uuid)).data.createdBy).toEqual({
      id: 99,
      name: null
    });
  });

  it.each([
    ['open'],
    ['1'],
    ['11111111-2222-4333-8444-555555555555'],
    [undefined]
  ])('says 404 with the code for %j', async (uuid) => {
    const { web } = makeWeb();
    const result = await getJob(web, uuid);
    expect(result).toMatchObject({ kind: 'json', status: 404 });
    expect(bodyOf(result)).toEqual({
      error: { status: 404, code: 'NOT_FOUND', message: 'No such import job.' }
    });
  });

  it('answers 500 with no detail, and logs what went wrong, when the store fails', async () => {
    const { web, store, logger } = makeWeb();
    store.getByUuid = async () => {
      throw new Error('connection to 10.0.0.5 refused, password=hunter2');
    };
    const result = await getJob(web, '11111111-2222-4333-8444-555555555555');
    expect(result).toMatchObject({ kind: 'json', status: 500 });
    expect(JSON.stringify(result)).not.toContain('hunter2');
    expect(bodyOf(result).error).toEqual({
      status: 500,
      message: 'The request failed.'
    });
    expect(JSON.stringify(logger.lines)).toContain('hunter2');
  });
});

describe('listOpenJobs', () => {
  it('gives the open and resumable jobs by entity, with the names of who uploaded them', async () => {
    const { web, store } = makeWeb();
    store.insert({ entity: 'product', status: 'validated', createdBy: 7 });
    store.insert({
      entity: 'category',
      status: 'stopped',
      startedAt: 5,
      createdBy: 8
    });
    store.insert({ entity: 'customer', status: 'completed' });
    const { data } = bodyOf(await listOpenJobs(web));
    expect(data.map((j: { entity: string }) => j.entity)).toEqual([
      'category',
      'product'
    ]);
    expect(
      data.map((j: { createdBy: { name: string | null } }) => j.createdBy?.name)
    ).toEqual([null, 'Jane Doe']);
  });

  it('gives an empty list when nothing is open', async () => {
    const { web } = makeWeb();
    expect(bodyOf(await listOpenJobs(web))).toEqual({ data: [] });
  });
});

describe('getIssues: the problems table', () => {
  const seed = () => {
    const ctx = makeWeb();
    const job = ctx.store.insert({
      status: 'validated',
      counts: {
        ...emptyCounts(),
        byCode: { validate: { INVALID_VALUE: 3 }, import: {} },
        issuesTruncated: { validate: true, import: false }
      }
    });
    ctx.store.seedIssues(job.id, [
      issue(5),
      issue(3),
      issue(null, { code: 'FILE_EMPTY', column: null })
    ]);
    return { ...ctx, job };
  };

  it('shows a page of problems with row, key, column, code, severity, message and value', async () => {
    const { web, job } = seed();
    const { data } = bodyOf(await getIssues(web, job.uuid, {}));
    expect(data).toMatchObject({
      phase: 'validate',
      page: 1,
      limit: 50,
      total: 3,
      byCode: { INVALID_VALUE: 3 },
      truncated: true
    });
    expect(data.items).toEqual([
      {
        row: null,
        key: 'k',
        column: null,
        code: 'FILE_EMPTY',
        severity: 'error',
        params: { reason: 'x' },
        message: 'English null',
        value: 'bad'
      },
      expect.objectContaining({ row: 3 }),
      expect.objectContaining({ row: 5 })
    ]);
  });

  it('shows the problems of the job asked for, not of the first one', async () => {
    const { web, store } = makeWeb();
    const first = store.insert({ entity: 'product', status: 'validated' });
    const second = store.insert({ entity: 'category', status: 'validated' });
    store.seedIssues(first.id, [issue(2, { message: 'of the first' })]);
    store.seedIssues(second.id, [issue(9, { message: 'of the second' })]);
    const { data } = bodyOf(await getIssues(web, second.uuid, {}));
    expect(data.items.map((i: { message: string }) => i.message)).toEqual([
      'of the second'
    ]);
  });

  it('passes the filters and the page on', async () => {
    const { web, job } = seed();
    const { data } = bodyOf(
      await getIssues(web, job.uuid, {
        code: 'INVALID_VALUE',
        limit: '1',
        page: '2'
      })
    );
    expect(data.items.map((i: { row: number }) => i.row)).toEqual([5]);
    expect(data.total).toBe(2);
  });

  it('says 400 for a filter it does not know, and 404 for a job that is not there', async () => {
    const { web, job } = seed();
    expect(await getIssues(web, job.uuid, { phase: 'later' })).toMatchObject({
      status: 400
    });
    expect(
      bodyOf(await getIssues(web, job.uuid, { limit: '9999' })).error.code
    ).toBe('INVALID_REQUEST');
    expect(await getIssues(web, 'open', {})).toMatchObject({ status: 404 });
  });
});

describe('the actions', () => {
  it('start gives the job back as queued', async () => {
    const { web, store } = makeWeb();
    const job = store.insert({ status: 'validated' });
    const result = await startJob(web, job.uuid);
    expect(result).toMatchObject({ status: 200 });
    expect(bodyOf(result).data.status).toBe('queued');
  });

  it('start says why it refuses: the code, the status and the details', async () => {
    const { web, store } = makeWeb();
    const wrong = store.insert({ status: 'completed' });
    expect(bodyOf(await startJob(web, wrong.uuid))).toEqual({
      error: {
        status: 409,
        code: 'WRONG_STATUS',
        message: 'This cannot be done to an import that is completed.',
        details: { status: 'completed' }
      }
    });
    const errors = store.insert({
      entity: 'product',
      status: 'validated',
      counts: { ...emptyCounts(), errors: 1 }
    });
    expect(bodyOf(await startJob(web, errors.uuid)).error.code).toBe(
      'FILE_HAS_ERRORS'
    );
    store.insert({ entity: 'customer', status: 'running' });
    const clean = store.insert({
      entity: 'customerAddress',
      status: 'validated'
    });
    const running = bodyOf(await startJob(web, clean.uuid));
    expect(running.error).toMatchObject({
      status: 409,
      code: 'IMPORT_ALREADY_RUNNING',
      details: { entity: 'customer' }
    });
  });

  it('cancel says what happened: canceled at once, or requested', async () => {
    const { web, store } = makeWeb();
    const queued = store.insert({ status: 'queued' });
    expect(bodyOf(await cancelJob(web, queued.uuid)).data).toMatchObject({
      status: 'canceled',
      cancel: 'canceled'
    });
    const running = store.insert({ entity: 'product', status: 'running' });
    expect(bodyOf(await cancelJob(web, running.uuid)).data).toMatchObject({
      status: 'running',
      cancelRequested: true,
      cancel: 'requested'
    });
  });

  it('resume, check again and delete give the job back', async () => {
    const { web, store } = makeWeb();
    const stopped = store.insert({ status: 'stopped', startedAt: 5 });
    expect(bodyOf(await resumeJob(web, stopped.uuid)).data.status).toBe(
      'queued'
    );
    const validated = store.insert({ entity: 'product', status: 'validated' });
    expect(bodyOf(await recheckJob(web, validated.uuid)).data.status).toBe(
      'uploaded'
    );
    const done = store.insert({ entity: 'customer', status: 'completed' });
    expect(bodyOf(await deleteJob(web, done.uuid)).data.uuid).toBe(done.uuid);
    expect(await store.get(done.id)).toBeNull();
  });

  it('delete refuses an active job with 409', async () => {
    const { web, store } = makeWeb();
    const running = store.insert({ status: 'running' });
    expect(await deleteJob(web, running.uuid)).toMatchObject({ status: 409 });
    expect(await store.get(running.id)).not.toBeNull();
  });

  it('all of them say 404 for a job that is not there', async () => {
    const { web } = makeWeb();
    for (const action of [
      startJob,
      cancelJob,
      resumeJob,
      recheckJob,
      deleteJob
    ]) {
      // eslint-disable-next-line no-await-in-loop
      expect(
        await action(web, '11111111-2222-4333-8444-555555555555')
      ).toMatchObject({
        status: 404
      });
    }
  });
});

describe('downloadFileWithErrors', () => {
  const FILE = 'url_key,name\nwomen,Women\nmen,Men\nkids,Kids\n';

  const staged = (
    more: Parameters<ReturnType<typeof makeWeb>['store']['insert']>[0] = {}
  ) => {
    const ctx = makeWeb();
    const job = ctx.store.insert({
      status: 'validated',
      fileName: 'categories.csv',
      ...more
    });
    const put = ctx.files.put(job.id, FILE, 8);
    ctx.store.live(job.id).chunkCount = put.chunkCount;
    return { ...ctx, job };
  };

  it('streams every row of the file with the problems in an _errors column', async () => {
    const { web, store, job } = staged();
    store.seedIssues(job.id, [
      issue(3, { column: 'name', message: 'The name is wrong.' }),
      issue(null, { code: 'DUPLICATE_COLUMN' })
    ]);
    const result = await downloadFileWithErrors(web, job.uuid, {});
    expect(result).toMatchObject({ kind: 'stream', status: 200 });
    expect(await textOf(result)).toBe(
      `${BOM}url_key,name,_errors\r\nwomen,Women,\r\nmen,Men,name: The name is wrong.\r\nkids,Kids,\r\n`
    );
  });

  it('sends the headers of a file download, and keeps it out of caches', async () => {
    const { web, job } = staged();
    const result = await downloadFileWithErrors(web, job.uuid, {});
    if (result.kind !== 'stream') throw new Error('stream expected');
    expect(result.headers).toEqual({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="categories-with-errors.csv"; filename*=UTF-8\'\'categories-with-errors.csv',
      'Cache-Control': 'no-store'
    });
    await textOf(result);
  });

  it('reads the table the page shows: the check before the job wrote, the import after', async () => {
    const { web, store, job } = staged();
    store.seedIssues(job.id, [
      issue(2, { phase: 'validate', message: 'check says' }),
      issue(3, { phase: 'import', message: 'import says' })
    ]);
    expect(
      await textOf(await downloadFileWithErrors(web, job.uuid, {}))
    ).toContain('check says');
    store.live(job.id).startedAt = 5;
    const after = await textOf(await downloadFileWithErrors(web, job.uuid, {}));
    expect(after).toContain('import says');
    expect(after).not.toContain('check says');
    expect(
      await textOf(
        await downloadFileWithErrors(web, job.uuid, { phase: 'validate' })
      )
    ).toContain('check says');
  });

  it('marks the rows past the cap on stored problems', async () => {
    const { web, store, job } = staged({
      counts: {
        ...emptyCounts(),
        issuesTruncated: { validate: true, import: false },
        firstUnlistedRow: { validate: 3, import: null }
      }
    });
    store.seedIssues(job.id, [issue(2, { message: 'listed' })]);
    const text = await textOf(await downloadFileWithErrors(web, job.uuid, {}));
    expect(text).toContain('status: listed');
    expect(text).toContain('men,Men,(more problems not listed)');
    expect(text).toContain('kids,Kids,(more problems not listed)');
    expect(text).not.toContain('women,Women,(more');
  });

  it('writes the messages in the language the web is given', async () => {
    const { web, store, job } = staged();
    web.render = (i) => `[vi] ${i.code}`;
    store.seedIssues(job.id, [issue(2)]);
    expect(
      await textOf(await downloadFileWithErrors(web, job.uuid, {}))
    ).toContain('status: [vi] INVALID_VALUE');
  });

  it('hides the password of a customer, so that the download does not give it back', async () => {
    const ctx = makeWeb();
    const job = ctx.store.insert({ status: 'validated', entity: 'customer' });
    const put = ctx.files.put(job.id, 'email,password\na@x.test,secret-1\n', 8);
    ctx.store.live(job.id).chunkCount = put.chunkCount;
    const text = await textOf(
      await downloadFileWithErrors(ctx.web, job.uuid, {})
    );
    expect(text).toContain('a@x.test,(hidden),');
    expect(text).not.toContain('secret-1');
  });

  it('leaves the password column of any other entity as it is', async () => {
    const ctx = makeWeb();
    const job = ctx.store.insert({ status: 'validated', entity: 'category' });
    const put = ctx.files.put(job.id, 'url_key,password\nwomen,shown\n', 8);
    ctx.store.live(job.id).chunkCount = put.chunkCount;
    const text = await textOf(
      await downloadFileWithErrors(ctx.web, job.uuid, {})
    );
    expect(text).toContain('women,shown,');
    expect(text).not.toContain('(hidden)');
  });

  it('uses the limits the file was checked with', async () => {
    const ctx = makeWeb({ limits: { maxRows: 1, maxCellLength: 65_536 } });
    const job = ctx.store.insert({ status: 'validated' });
    const put = ctx.files.put(job.id, FILE, 8);
    ctx.store.live(job.id).chunkCount = put.chunkCount;
    // Three rows, and the limit is one: the reader stops, so there is no copy.
    expect(
      bodyOf(await downloadFileWithErrors(ctx.web, job.uuid, {})).error.code
    ).toBe('FILE_UNAVAILABLE');
  });

  it('marks the rows past the cap of the import when it is the import that is shown', async () => {
    const { web, store, job } = staged({
      startedAt: 5,
      counts: {
        ...emptyCounts(),
        issuesTruncated: { validate: false, import: true },
        firstUnlistedRow: { validate: null, import: 4 }
      }
    });
    store.seedIssues(job.id, [
      issue(2, { phase: 'import', message: 'failed' })
    ]);
    const text = await textOf(await downloadFileWithErrors(web, job.uuid, {}));
    expect(text).toContain('kids,Kids,(more problems not listed)');
    expect(text).not.toContain('men,Men,(more');
  });

  it('closes the file when the reader of the download stops half way', async () => {
    const ctx = makeWeb();
    const job = ctx.store.insert({ status: 'validated' });
    // A long file: when the first chunk of the answer is ready the file is not all read.
    const rows = Array.from({ length: 150_000 }, (_, n) => `${n},value`).join(
      '\n'
    );
    const put = ctx.files.put(job.id, `a,b\n${rows}\n`, 16_384);
    ctx.store.live(job.id).chunkCount = put.chunkCount;
    const opened: Array<{ destroyed: boolean }> = [];
    const open = ctx.files.open.bind(ctx.files);
    ctx.web.files = {
      open(jobId: number) {
        const stream = open(jobId);
        opened.push(stream);
        return stream;
      }
    };
    const result = await downloadFileWithErrors(ctx.web, job.uuid, {});
    if (result.kind !== 'stream') throw new Error('stream expected');
    const iterator = result.body[Symbol.asyncIterator]();
    await iterator.next();
    expect(opened[0].destroyed).toBe(false);
    await iterator.return?.();
    // The stream tears itself down on the next turn of the event loop.
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    expect(opened).toHaveLength(1);
    expect(opened[0].destroyed).toBe(true);
  });

  it('refuses a phase it does not know', async () => {
    const { web, job } = staged();
    expect(
      await downloadFileWithErrors(web, job.uuid, { phase: 'later' })
    ).toMatchObject({
      status: 400
    });
  });

  describe('when there is no file to give, it says 409 FILE_UNAVAILABLE before it sends a byte', () => {
    const unavailable = (
      result: Awaited<ReturnType<typeof downloadFileWithErrors>>
    ) => {
      expect(result).toMatchObject({ kind: 'json', status: 409 });
      expect(bodyOf(result).error.code).toBe('FILE_UNAVAILABLE');
    };

    it('the upload is not complete', async () => {
      const ctx = makeWeb();
      const job = ctx.store.insert({ status: 'uploading', chunkCount: null });
      const result = await downloadFileWithErrors(ctx.web, job.uuid, {});
      unavailable(result);
      expect(bodyOf(result).error.message).toContain(
        'not been uploaded completely'
      );
    });

    it('the file was deleted (a job that ended clean keeps none)', async () => {
      const { web, files, job } = staged({ status: 'completed' });
      files.damage(job.id, 'drop-first-chunk');
      unavailable(await downloadFileWithErrors(web, job.uuid, {}));
    });

    it('the file is damaged', async () => {
      const { web, files, job } = staged();
      files.damage(job.id, 'flip-byte');
      unavailable(await downloadFileWithErrors(web, job.uuid, {}));
    });

    it('the file is empty', async () => {
      const ctx = makeWeb();
      const job = ctx.store.insert({ status: 'validated' });
      ctx.files.put(job.id, '', 8);
      ctx.store.live(job.id).chunkCount = 0;
      unavailable(await downloadFileWithErrors(ctx.web, job.uuid, {}));
    });

    it('the check stopped, and the job has written something since (the import is what is shown)', async () => {
      const { web, store, job } = staged({ startedAt: 5 });
      store.seedIssues(job.id, [
        issue(null, { code: 'UNCLOSED_QUOTE', column: null })
      ]);
      unavailable(await downloadFileWithErrors(web, job.uuid, {}));
    });

    it.each([
      'FILE_ENCODING',
      'WRONG_DELIMITER',
      'UNCLOSED_QUOTE',
      'ROW_TOO_LARGE',
      'FILE_TOO_LARGE'
    ])('the check stopped before the end of the file (%s)', async (code) => {
      const { web, store, job } = staged();
      store.seedIssues(job.id, [issue(null, { code, column: null })]);
      unavailable(await downloadFileWithErrors(web, job.uuid, {}));
    });

    it('the reader stops early, before the first byte (a small file with a quote that never closes)', async () => {
      const ctx = makeWeb();
      const job = ctx.store.insert({ status: 'validated' });
      const put = ctx.files.put(job.id, 'a,b\n1,"2\n3,4\n', 4);
      ctx.store.live(job.id).chunkCount = put.chunkCount;
      unavailable(await downloadFileWithErrors(ctx.web, job.uuid, {}));
    });
  });

  it('fails the stream, and the connection with it, when the reader stops after the first byte (a long file with a quote that never closes)', async () => {
    const ctx = makeWeb();
    const job = ctx.store.insert({ status: 'validated' });
    const rows = Array.from({ length: 12_000 }, (_, n) => `${n},value`).join(
      '\n'
    );
    const put = ctx.files.put(job.id, `a,b\n${rows}\n1,"2\n`);
    ctx.store.live(job.id).chunkCount = put.chunkCount;
    // More than a chunk of the answer is ready before the end of the file shows.
    const result = await downloadFileWithErrors(ctx.web, job.uuid, {});
    expect(result.kind).toBe('stream');
    await expect(textOf(result)).rejects.toThrow('cannot be read to the end');
  });

  it('says 404 for a job that is not there', async () => {
    const { web } = makeWeb();
    expect(await downloadFileWithErrors(web, 'open', {})).toMatchObject({
      status: 404
    });
  });
});

describe('contentDisposition', () => {
  it.each([
    ['products.csv', 'products-with-errors.csv'],
    ['my products.csv', 'my products-with-errors.csv'],
    ['no-extension', 'no-extension-with-errors.csv'],
    ['archive.tar.gz', 'archive.tar-with-errors.csv'],
    ['', 'import-with-errors.csv']
  ])('names the download of %j %j', (given, name) => {
    const header = contentDisposition(given);
    expect(header).toContain(
      `filename="${name.replace(/[^A-Za-z0-9._ -]/g, '_')}"`
    );
    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent(name)}`);
  });

  it('gives a name that is not ASCII twice: a fallback and the encoded one', () => {
    const header = contentDisposition('sản phẩm.csv');
    expect(header).toBe(
      'attachment; filename="s_n ph_m-with-errors.csv"; filename*=UTF-8\'\'s%E1%BA%A3n%20ph%E1%BA%A9m-with-errors.csv'
    );
  });

  it('cannot be used to inject a header or break out of the quotes', () => {
    const header = contentDisposition('a"b\r\nSet-Cookie: x=1;.csv');
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.match(/"/g)).toHaveLength(2);
    expect(header).not.toContain("'(");
  });

  it('encodes the characters that the encoded form leaves bare', () => {
    expect(contentDisposition("it's (a) *file*.csv")).toContain(
      "filename*=UTF-8''it%27s%20%28a%29%20%2Afile%2A-with-errors.csv"
    );
  });
});
