import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { uploadJob } from '../../../web/upload.js';
import type { HttpResult } from '../../../web/ImportWeb.js';
import { multipart, postTo } from '../helpers/multipartClient.js';
import type { Part } from '../helpers/multipartClient.js';
import { makeWeb } from '../helpers/webHarness.js';
import type { WebHarness } from '../helpers/webHarness.js';

/**
 * The upload on a real HTTP server: multer reads the multipart body and the
 * file goes into the store as it arrives.
 */
let ctx: WebHarness;
let server: http.Server;
let port: number;

beforeAll(async () => {
  server = http.createServer((request, response) => {
    uploadJob(ctx.web, request, response, 7).then((result: HttpResult) => {
      if (result.kind !== 'json') throw new Error('json expected');
      response.statusCode = result.status;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(result.body));
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
});

const post = (...args: [Buffer, string?, number?]) => postTo(port, ...args);

const FILE = Buffer.from('url_key,name\nwomen,Women\nmen,Men\n');
const fields = (extra: Part[] = []): Part[] => [
  { name: 'entity', value: 'category' },
  { name: 'mode', value: 'create' },
  { name: 'checkImages', value: 'true' },
  ...extra
];
const file = (content = FILE, filename = 'categories.csv'): Part => ({
  name: 'file',
  filename,
  content
});

describe('uploadJob: a good upload', () => {
  it('stores the file, and answers with the job', async () => {
    ctx = makeWeb({ chunkBytes: 8 });
    const answer = await post(multipart([...fields(), file()]));
    expect(answer.status).toBe(200);
    expect(answer.body.data).toMatchObject({
      entity: 'category',
      mode: 'create',
      status: 'uploaded',
      options: { checkImages: true },
      fileName: 'categories.csv',
      fileSize: FILE.length,
      replaced: false,
      createdBy: { id: 7, name: 'Jane Doe' }
    });
    const job = await ctx.store.getByUuid(answer.body.data.uuid);
    expect(Buffer.concat(ctx.store.chunksOf(job!.id)).equals(FILE)).toBe(true);
  });

  it('keeps a file name that is not ASCII', async () => {
    ctx = makeWeb();
    const answer = await post(
      multipart([...fields(), file(FILE, 'sản phẩm — 日本.csv')])
    );
    expect(answer.body.data.fileName).toBe('sản phẩm — 日本.csv');
  });

  it('stores a file of several chunks, sent in pieces of any size', async () => {
    ctx = makeWeb({ maxFileBytes: 10_000_000 });
    const big = Buffer.alloc(2_621_440 + 5);
    for (let at = 0; at < big.length; at += 1) big[at] = (at * 13) % 251;
    const answer = await post(
      multipart([...fields(), file(big)]),
      undefined,
      100_003
    );
    expect(answer.status).toBe(200);
    const job = (await ctx.store.getByUuid(answer.body.data.uuid))!;
    expect(job.chunkCount).toBe(3);
    expect(Buffer.concat(ctx.store.chunksOf(job.id)).equals(big)).toBe(true);
  });

  it('says that it replaced the unstarted job of the entity', async () => {
    ctx = makeWeb();
    const old = ctx.store.insert({ status: 'validated' });
    const answer = await post(multipart([...fields(), file()]));
    expect(answer.body.data.replaced).toBe(true);
    expect(await ctx.store.get(old.id)).toBeNull();
  });

  it('takes the defaults when only the entity is sent', async () => {
    ctx = makeWeb();
    const answer = await post(
      multipart([{ name: 'entity', value: 'product' }, file()])
    );
    expect(answer.body.data).toMatchObject({
      entity: 'product',
      mode: 'upsert',
      options: { checkImages: false }
    });
  });
});

describe('uploadJob: a request it refuses, and leaves nothing behind', () => {
  const nothingLeft = async () => {
    expect(await ctx.store.listOpen()).toEqual([]);
    expect(ctx.store.chunksOf(1)).toEqual([]);
    expect(await ctx.store.get(1)).toBeNull();
  };

  it('the entity comes after the file', async () => {
    ctx = makeWeb();
    const answer = await post(
      multipart([file(), { name: 'entity', value: 'category' }])
    );
    expect(answer.status).toBe(400);
    expect(answer.body.error).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(answer.body.error.message).toContain('before');
    await nothingLeft();
  });

  it('a field comes after the file: the job it made is deleted', async () => {
    ctx = makeWeb();
    const answer = await post(
      multipart([
        { name: 'entity', value: 'category' },
        file(),
        { name: 'mode', value: 'create' }
      ])
    );
    expect(answer.status).toBe(400);
    expect(answer.body.error.message).toContain('mode');
    await nothingLeft();
  });

  it('there is no file', async () => {
    ctx = makeWeb();
    const answer = await post(multipart(fields()));
    expect(answer.status).toBe(400);
    expect(answer.body.error.code).toBe('INVALID_REQUEST');
    await nothingLeft();
  });

  it.each([
    [{ name: 'entity', value: 'order' }, 'entity'],
    [{ name: 'entity', value: 'category' }, 'mode']
  ])('a value it does not know (%j)', async (entity, field) => {
    ctx = makeWeb();
    const parts: Part[] =
      field === 'mode'
        ? [entity as Part, { name: 'mode', value: 'merge' }, file()]
        : [entity as Part, file()];
    const answer = await post(multipart(parts));
    expect(answer.status).toBe(400);
    expect(answer.body.error.message).toContain(field);
    await nothingLeft();
  });

  it('the file has another name than "file", or there are two files', async () => {
    ctx = makeWeb();
    const other = await post(
      multipart([
        { name: 'entity', value: 'category' },
        { ...file(), name: 'upload' }
      ])
    );
    expect(other.status).toBe(400);
    ctx = makeWeb();
    const two = await post(
      multipart([{ name: 'entity', value: 'category' }, file(), file()])
    );
    expect(two.status).toBe(400);
    expect(await ctx.store.listOpen()).toEqual([]);
  });

  it('the body is not multipart', async () => {
    ctx = makeWeb();
    const answer = await post(
      Buffer.from('{"entity":"category"}'),
      'application/json'
    );
    expect(answer.status).toBe(400);
    expect(answer.body.error.code).toBe('INVALID_REQUEST');
  });

  it('the file is over the size limit: 413, and the part that came is not kept', async () => {
    ctx = makeWeb({ maxFileBytes: 1_000_000 });
    const answer = await post(
      multipart([...fields(), file(Buffer.alloc(3_000_000, 7))])
    );
    expect(answer.status).toBe(413);
    expect(answer.body.error).toMatchObject({ code: 'FILE_TOO_LARGE' });
    await nothingLeft();
  });

  it('the import of the entity is busy: 409, before the file is read', async () => {
    ctx = makeWeb();
    const running = ctx.store.insert({ entity: 'category', status: 'running' });
    const answer = await post(multipart([...fields(), file()]));
    expect(answer.status).toBe(409);
    expect(answer.body.error).toMatchObject({
      code: 'IMPORT_RUNNING',
      details: { entity: 'category' }
    });
    expect((await ctx.store.listOpen()).map((j) => j.id)).toEqual([running.id]);
  });

  it('a field that is far too long', async () => {
    ctx = makeWeb();
    const answer = await post(
      multipart([
        { name: 'entity', value: 'category' },
        { name: 'checkImages', value: 'x'.repeat(5000) },
        file()
      ])
    );
    expect(answer.status).toBe(400);
    expect(answer.body.error.message).toContain('too many or too large');
    await nothingLeft();
  });
});
