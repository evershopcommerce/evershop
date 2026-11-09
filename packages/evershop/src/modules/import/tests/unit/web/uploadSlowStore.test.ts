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
 * The upload on a real HTTP server, with a store that takes time to answer, as
 * PostgreSQL does. The store of the other upload tests answers at once, and with
 * it the reason a read of the file stopped (a file that is too large, an upload
 * that was removed) always reached the answer first. When the read stops, the
 * stream of the file is destroyed and multer reports an `AbortError` at once;
 * `receive` says why only after it has cleaned up, which with a database comes
 * later. Found on a running store (QA 2026-10-26): 500 "The request failed."
 * instead of 413 "The file is larger than 100 MB."
 */
let ctx: WebHarness;
let server: http.Server;
let port: number;
// What the server answered, in order (a client that has left does not read it).
const answered: number[] = [];

beforeAll(async () => {
  server = http.createServer((request, response) => {
    uploadJob(ctx.web, request, response, 7).then((result: HttpResult) => {
      if (result.kind !== 'json') throw new Error('json expected');
      answered.push(result.status);
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

const fields = (): Part[] => [
  { name: 'entity', value: 'category' },
  { name: 'mode', value: 'create' },
  { name: 'checkImages', value: 'true' }
];
const file = (content: Buffer): Part => ({
  name: 'file',
  filename: 'categories.csv',
  content
});

/** The store removes an upload after `ms` milliseconds, as a database does. */
const slowRemoval = (ms: number) => {
  const abortUpload = ctx.store.abortUpload.bind(ctx.store);
  ctx.store.abortUpload = async (id: number) => {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
    return abortUpload(id);
  };
};

const nothingLeft = async () => {
  expect(await ctx.store.listOpen()).toEqual([]);
  expect(ctx.store.chunksOf(1)).toEqual([]);
  expect(await ctx.store.get(1)).toBeNull();
};

describe('uploadJob: the reason the read stopped, with a store that takes time', () => {
  it.each([0, 5, 50])(
    'the file is over the size limit and the store needs %i ms to remove it: 413',
    async (ms) => {
      ctx = makeWeb({ maxFileBytes: 2 * 1_048_576 });
      slowRemoval(ms);
      const answer = await post(
        multipart([...fields(), file(Buffer.alloc(5 * 1_048_576, 7))])
      );
      expect(answer.status).toBe(413);
      expect(answer.body.error).toMatchObject({
        code: 'FILE_TOO_LARGE',
        message: 'The file is larger than 2 MB.'
      });
      expect(ctx.logger.of('error')).toEqual([]);
      await nothingLeft();
    }
  );

  it('the upload is removed while the file is read: 404, not 500', async () => {
    ctx = makeWeb({ chunkBytes: 8 });
    slowRemoval(5);
    const addChunk = ctx.store.addChunk.bind(ctx.store);
    let chunks = 0;
    ctx.store.addChunk = async (...args: Parameters<typeof addChunk>) => {
      chunks += 1;
      return chunks > 1 ? false : addChunk(...args);
    };
    const answer = await post(
      multipart([...fields(), file(Buffer.alloc(300, 7))])
    );
    expect(answer.status).toBe(404);
    expect(answer.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(ctx.logger.of('error')).toEqual([]);
    await nothingLeft();
  });

  it('the store fails while the file is read: 500, and the log says what failed, not that it was aborted', async () => {
    ctx = makeWeb({ chunkBytes: 8 });
    slowRemoval(5);
    ctx.store.addChunk = async () => {
      throw new Error('connection lost');
    };
    const answer = await post(
      multipart([...fields(), file(Buffer.alloc(300, 7))])
    );
    expect(answer.status).toBe(500);
    expect(answer.body.error.message).toBe('The request failed.');
    const logged = ctx.logger.of('error').map((line) => line.meta?.error);
    expect(logged).toEqual(['connection lost']);
    await nothingLeft();
  });

  it('the client leaves in the middle of the body: still 400 and no error in the log', async () => {
    ctx = makeWeb();
    slowRemoval(5);
    answered.length = 0;
    const body = multipart([...fields(), file(Buffer.alloc(200_000, 65))]);
    await new Promise<void>((resolve) => {
      const request = http.request({
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/',
        headers: { 'Content-Type': 'multipart/form-data; boundary=BOUNDARY' }
      });
      request.on('error', () => undefined);
      request.write(body.subarray(0, 50_000), () => {
        request.destroy();
        resolve();
      });
    });
    for (let tries = 0; tries < 100 && answered.length === 0; tries += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => {
        setTimeout(r, 20);
      });
    }
    expect(answered).toEqual([400]);
    expect(await ctx.store.listOpen()).toEqual([]);
    expect(ctx.logger.of('error')).toEqual([]);
  });
});
