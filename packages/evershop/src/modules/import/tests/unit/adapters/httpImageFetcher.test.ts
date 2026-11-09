import { createHash } from 'crypto';
import http from 'http';
import { AddressInfo } from 'net';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach
} from '@jest/globals';
import { generateFileName } from '../../../../cms/services/generateFileName.js';
import { createHttpImageFetcher } from '../../../adapters/HttpImageFetcher.js';
import type { StoredFile } from '../../../adapters/HttpImageFetcher.js';
import type { LookupFunction } from '../../../../../lib/ssrf/guardedLookup.js';
import { imageFetcherContract } from '../helpers/imageFetcherContract.js';

const LIMIT = 1000;
const PNG = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  Buffer.alloc(92, 7)
]);

const keyDeps = {
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex'),
  sanitizeFileName: generateFileName as (original: string) => string
};

const lookup: LookupFunction = (_hostname, _options, callback) => {
  callback(null, [{ address: '127.0.0.1', family: 4 }]);
};

async function startServer() {
  const seen: string[] = [];
  const server = http.createServer((req, res) => {
    seen.push(req.url ?? '');
    switch (req.url) {
      case '/Blue%20Tee.JPG':
      case '/final.png':
        res.writeHead(200, { 'content-type': 'image/png' });
        res.end(PNG);
        break;
      case '/via-redirect':
        res.writeHead(302, { location: '/final.png' });
        res.end();
        break;
      case '/page':
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html></html>');
        break;
      case '/huge':
        res.writeHead(200, { 'content-type': 'image/png' });
        res.end(Buffer.alloc(LIMIT + 1, 1));
        break;
      default:
        res.writeHead(404);
        res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return { server, port, seen };
}

function build(
  state: { privateAllowed: boolean },
  stored: StoredFile[],
  extra: Partial<Parameters<typeof createHttpImageFetcher>[0]> = {}
) {
  return createHttpImageFetcher({
    allowPrivate: () => state.privateAllowed,
    lookup,
    timeoutMs: 5000,
    allowedTypes: () => ['image/png', 'image/jpeg'],
    maxBytesForType: () => LIMIT,
    keyDeps,
    store: async (file) => {
      stored.push(file);
      return { url: `/assets/${file.directory}/${file.fileName}` };
    },
    ...extra
  });
}

imageFetcherContract('HttpImageFetcher on a local server', async () => {
  const { server, port } = await startServer();
  const state = { privateAllowed: true };
  const fetcher = build(state, []);
  const free = http.createServer();
  await new Promise<void>((resolve) => free.listen(0, '127.0.0.1', resolve));
  const closedPort = (free.address() as AddressInfo).port;
  await new Promise<void>((resolve) => free.close(() => resolve()));
  return {
    context: {
      fetcher,
      urls: {
        ok: `http://img.test:${port}/final.png`,
        notFound: `http://img.test:${port}/missing.png`,
        notImage: `http://img.test:${port}/page`,
        tooLarge: `http://img.test:${port}/huge`,
        blocked: 'http://169.254.169.254/x.png',
        unreachable: `http://img.test:${closedPort}/a.png`
      },
      setPrivateAllowed: (allowed: boolean) => {
        state.privateAllowed = allowed;
      }
    },
    cleanup: async () => {
      await fetcher.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
});

describe('createHttpImageFetcher', () => {
  let server: http.Server;
  let port: number;
  let seen: string[];
  let state: { privateAllowed: boolean };
  let stored: StoredFile[];

  beforeAll(async () => {
    ({ server, port, seen } = await startServer());
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    seen.length = 0;
    state = { privateAllowed: true };
    stored = [];
  });

  const url = (path: string) => `http://img.test:${port}${path}`;

  it('hands the file to the store, with a folder and a name that come from the URL', async () => {
    const fetcher = build(state, stored);
    const source = url('/Blue%20Tee.JPG');
    const result = await fetcher.fetchAndStore(source);
    const hash = keyDeps.sha256Hex(source);
    expect(stored).toHaveLength(1);
    expect(stored[0].directory).toBe(
      `catalog/${hash.slice(0, 8)}/${hash.slice(8, 16)}`
    );
    // The extension is the one of the content type, not the one of the URL.
    expect(stored[0].fileName).toBe('blue-tee.png');
    expect(stored[0].contentType).toBe('image/png');
    expect(stored[0].buffer.equals(PNG)).toBe(true);
    expect(result).toEqual({
      url: `/assets/${stored[0].directory}/blue-tee.png`,
      copied: true
    });
    await fetcher.close();
  });

  it('keys the file by the URL of the cell, not by where the redirects ended', async () => {
    const fetcher = build(state, stored);
    await fetcher.fetchAndStore(url('/via-redirect'));
    const hash = keyDeps.sha256Hex(url('/via-redirect'));
    expect(stored[0].directory).toBe(
      `catalog/${hash.slice(0, 8)}/${hash.slice(8, 16)}`
    );
    expect(stored[0].fileName).toBe('via-redirect.png');
    await fetcher.close();
  });

  it('writes to the same place when it reads the same URL again: it replaces the file', async () => {
    const fetcher = build(state, stored);
    await fetcher.fetchAndStore(url('/final.png'));
    await fetcher.fetchAndStore(url('/final.png'));
    expect(stored).toHaveLength(2);
    expect([stored[0].directory, stored[0].fileName]).toEqual([
      stored[1].directory,
      stored[1].fileName
    ]);
    await fetcher.close();
  });

  it('writes nothing when the image cannot be read (IMP-03: before anything is written)', async () => {
    const fetcher = build(state, stored);
    await expect(fetcher.fetchAndStore(url('/page'))).rejects.toMatchObject({
      reason: 'not_an_image'
    });
    await expect(fetcher.fetchAndStore(url('/huge'))).rejects.toMatchObject({
      reason: 'too_large'
    });
    expect(stored).toHaveLength(0);
    await fetcher.close();
  });

  it('keeps an address in its own storage as it is: no request, no copy (IMG-06)', async () => {
    const fetcher = build(state, stored, {
      ownStorage: () => [
        `http://img.test:${port}/final.png/`,
        `http://img.test:${port}/assets`
      ]
    });
    const own = `http://img.test:${port}/assets/catalog/ab/cd/tee.png`;
    expect(await fetcher.fetchAndStore(own)).toEqual({
      url: own,
      copied: false
    });
    await fetcher.probe(own);
    expect(seen).toHaveLength(0);
    expect(stored).toHaveLength(0);
    // An address that only looks like it is fetched.
    await expect(
      fetcher.fetchAndStore(`http://img.test:${port}/assetsevil/x.png`)
    ).rejects.toMatchObject({ reason: 'http_status' });
    await fetcher.close();
  });

  it('fails with storage_failed and the reason when the store fails', async () => {
    const fetcher = build(state, stored, {
      store: async () => {
        throw new Error('EACCES: permission denied');
      }
    });
    const error = await fetcher
      .fetchAndStore(url('/final.png'))
      .catch((e) => e);
    expect([error.reason, error.params]).toEqual([
      'storage_failed',
      { message: 'EACCES: permission denied' }
    ]);
    await fetcher.close();
  });

  it('probes without storing', async () => {
    const fetcher = build(state, stored);
    await fetcher.probe(url('/final.png'));
    expect(stored).toHaveLength(0);
    await fetcher.close();
  });
});
