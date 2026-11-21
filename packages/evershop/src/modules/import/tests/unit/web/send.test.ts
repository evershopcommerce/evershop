import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { HttpResult } from '../../../web/ImportWeb.js';
import { send } from '../../../web/send.js';
import { makeWeb } from '../helpers/webHarness.js';

let ctx = makeWeb();
let result: HttpResult;
let server: http.Server;
let port: number;

beforeAll(async () => {
  // Express gives the response its `status` and `json`, as core's server does.
  const app = express();
  app.use((request, response) => {
    send(ctx.web, response as never, result);
  });
  server = http.createServer(app);
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

function get(): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  text: string;
  broken: boolean;
}> {
  return new Promise((resolve) => {
    http
      .get({ host: '127.0.0.1', port, path: '/', agent: false }, (response) => {
        let text = '';
        let broken = false;
        response.on('data', (chunk) => {
          text += chunk;
        });
        response.on('aborted', () => {
          broken = true;
        });
        response.on('error', () => {
          broken = true;
        });
        response.on('close', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            text,
            broken: broken || !response.complete
          })
        );
      })
      .on('error', () =>
        resolve({ status: 0, headers: {}, text: '', broken: true })
      );
  });
}

describe('send', () => {
  it('sends a JSON answer with its status', async () => {
    ctx = makeWeb();
    result = { kind: 'json', status: 409, body: { error: { code: 'X' } } };
    const answer = await get();
    expect(answer.status).toBe(409);
    expect(answer.headers['content-type']).toContain('application/json');
    expect(JSON.parse(answer.text)).toEqual({ error: { code: 'X' } });
  });

  it('streams a file with its headers, whole', async () => {
    ctx = makeWeb();
    async function* body() {
      yield 'a,b\r\n';
      yield '1,2\r\n';
    }
    result = {
      kind: 'stream',
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'X-Test': 'yes' },
      body: body()
    };
    const answer = await get();
    expect(answer.status).toBe(200);
    expect(answer.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(answer.headers['x-test']).toBe('yes');
    expect(answer.text).toBe('a,b\r\n1,2\r\n');
    expect(answer.broken).toBe(false);
  });

  it('streams a long file', async () => {
    ctx = makeWeb();
    async function* body() {
      for (let n = 0; n < 2000; n += 1) yield `${n},${'x'.repeat(100)}\r\n`;
    }
    result = { kind: 'stream', status: 200, headers: {}, body: body() };
    const answer = await get();
    expect(answer.text.split('\r\n')).toHaveLength(2001);
    expect(answer.broken).toBe(false);
  });

  it('destroys the connection when the stream fails after the first byte, so the download fails', async () => {
    ctx = makeWeb();
    async function* body() {
      yield 'a,b\r\n';
      throw new Error('the database went away');
    }
    result = { kind: 'stream', status: 200, headers: {}, body: body() };
    const answer = await get();
    expect(answer.broken).toBe(true);
    expect(ctx.logger.lines.map((l) => l.message)).toContain(
      'The file with errors could not be sent'
    );
  });
});
