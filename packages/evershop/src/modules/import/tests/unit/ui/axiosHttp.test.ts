import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { axiosHttp, progressOf } from '../../../ui/axiosHttp.js';
import { createImportApi } from '../../../ui/importApi.js';

/**
 * Axios as the `Http` of the pages, against a real local server: any HTTP status
 * is an answer, the header names come back in lower case, a multipart body keeps
 * the order of its fields, and the progress of an upload is reported.
 */
interface Seen {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}
const seen: Seen[] = [];
let server: http.Server;
let base = '';

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      seen.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks)
      });
      if (req.url?.startsWith('/limited')) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': '17'
        });
        res.end(
          JSON.stringify({
            error: { status: 429, message: 'Too many requests' }
          })
        );
      } else if (req.url?.startsWith('/missing')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: { status: 404, code: 'NOT_FOUND', message: 'No such job' }
          })
        );
      } else if (req.url?.startsWith('/html')) {
        res.writeHead(502, { 'Content-Type': 'text/html' });
        res.end('<html>Bad gateway</html>');
      } else if (req.url?.startsWith('/cookie')) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': ['a=1', 'b=2']
        });
        res.end(JSON.stringify({ data: {} }));
      } else if (req.url?.startsWith('/slow')) {
        // never answers
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { ok: true, url: req.url } }));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
});

describe('axios as the network of the import pages', () => {
  it('reads a good answer: status, data, and the header names in lower case', async () => {
    const reply = await axiosHttp.send({ method: 'GET', url: `${base}/ok` });
    expect(reply.status).toBe(200);
    expect(reply.data).toEqual({ data: { ok: true, url: '/ok' } });
    expect(reply.headers['content-type']).toContain('application/json');
  });

  it('keeps only headers that are one text (a list, like Set-Cookie, is not for the page)', async () => {
    const reply = await axiosHttp.send({
      method: 'GET',
      url: `${base}/cookie`
    });
    expect(
      Object.values(reply.headers).every((v) => typeof v === 'string')
    ).toBe(true);
    expect(reply.headers['set-cookie']).toBeUndefined();
  });

  it('sends the query parameters', async () => {
    await axiosHttp.send({
      method: 'GET',
      url: `${base}/issues`,
      params: { column: 'price', page: 2 }
    });
    expect(seen.at(-1)!.url).toBe('/issues?column=price&page=2');
  });

  it('does not throw on a refusal: the page reads the code in the answer', async () => {
    const reply = await axiosHttp.send({
      method: 'GET',
      url: `${base}/missing`
    });
    expect(reply.status).toBe(404);
    expect(reply.data).toEqual({
      error: { status: 404, code: 'NOT_FOUND', message: 'No such job' }
    });
  });

  it('gives the Retry-After of a 429 to the client', async () => {
    const api = createImportApi(axiosHttp, () => 0);
    const result = await api.getJob(`${base}/limited`);
    expect(result).toMatchObject({
      ok: false,
      error: { status: 429, retryAfterMs: 17_000 }
    });
  });

  it('copes with an answer that is not JSON (a proxy’s page)', async () => {
    const api = createImportApi(axiosHttp, () => 0);
    expect(await api.getJob(`${base}/html`)).toMatchObject({
      ok: false,
      error: { status: 502, code: null }
    });
  });

  it('sends the header that a form on another site cannot send', async () => {
    const api = createImportApi(axiosHttp, () => 0);
    await api.start(`${base}/start`);
    expect(seen.at(-1)!.method).toBe('POST');
    expect(seen.at(-1)!.headers['x-import-request']).toBe('1');
  });

  it('throws when there is no answer at all, which the client turns into status 0', async () => {
    const api = createImportApi(axiosHttp, () => 0);
    const gone = http.createServer();
    await new Promise<void>((r) => gone.listen(0, '127.0.0.1', r));
    const port = (gone.address() as AddressInfo).port;
    await new Promise((r) => gone.close(r));
    expect(await api.getJob(`http://127.0.0.1:${port}/x`)).toMatchObject({
      ok: false,
      error: { status: 0, aborted: false }
    });
  });

  it('stops a request that the page aborts, and says so', async () => {
    const api = createImportApi(axiosHttp, () => 0);
    const controller = new AbortController();
    const pending = api.getJob(`${base}/slow`, controller.signal);
    setTimeout(() => controller.abort(), 20);
    expect(await pending).toMatchObject({
      ok: false,
      error: { status: 0, aborted: true }
    });
  });

  describe('an upload', () => {
    const file = Object.assign(
      new Blob(['sku,name\n'.repeat(5000)], { type: 'text/csv' }),
      {
        name: 'products.csv'
      }
    );

    it('arrives as multipart with the fields before the file, and the header', async () => {
      const api = createImportApi(axiosHttp, () => 0);
      const result = await api.upload(`${base}/import-jobs`, {
        entity: 'product',
        mode: 'create',
        checkImages: false,
        file
      });
      expect(result.ok).toBe(true);
      const request = seen.at(-1)!;
      expect(request.headers['content-type']).toMatch(
        /^multipart\/form-data; boundary=/
      );
      expect(request.headers['x-import-request']).toBe('1');
      const text = request.body.toString('utf8');
      const order = [
        'name="entity"',
        'name="mode"',
        'name="checkImages"',
        'name="file"'
      ].map((needle) => text.indexOf(needle));
      expect(order.every((i) => i >= 0)).toBe(true);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(text).toContain('filename="products.csv"');
    });

    it('reports how much was sent, ending at the whole', async () => {
      const api = createImportApi(axiosHttp, () => 0);
      const reports: Array<[number, number]> = [];
      await api.upload(
        `${base}/import-jobs`,
        { entity: 'product', mode: 'upsert', checkImages: false, file },
        (sent, total) => reports.push([sent, total])
      );
      expect(reports.length).toBeGreaterThan(0);
      const [sent, total] = reports.at(-1)!;
      expect(sent).toBe(total);
      expect(total).toBeGreaterThan(file.size);
      const sents = reports.map(([s]) => s);
      expect(sents).toEqual([...sents].sort((a, b) => a - b));
    });
  });
});

describe('the progress of an upload', () => {
  it('is how much was sent and how much there is', () => {
    expect(progressOf({ loaded: 50, total: 200 })).toEqual([50, 200]);
  });

  it('has a total of 0 when axios does not know it, so the bar does not jump to 100', () => {
    expect(progressOf({ loaded: 50 })).toEqual([50, 0]);
  });
});
