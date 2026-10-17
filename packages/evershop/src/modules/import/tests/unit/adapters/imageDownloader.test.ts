import http from 'http';
import { AddressInfo } from 'net';
import zlib from 'zlib';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach
} from '@jest/globals';
import { createImageDownloader } from '../../../adapters/imageDownloader.js';
import type {
  ImageDownloader,
  ImageDownloaderOptions
} from '../../../adapters/imageDownloader.js';
import type { LookupFunction } from '../../../../../lib/ssrf/guardedLookup.js';
import type { ImageError } from '../../../services/images/types.js';

const LIMIT = 1000;
const PNG = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  Buffer.alloc(92, 7)
]);

type Seen = {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
};

/** `img.test` is what a user writes in a URL; the fake DNS sends it to the local server. */
const lookup: LookupFunction = (_hostname, _options, callback) => {
  callback(null, [{ address: '127.0.0.1', family: 4 }]);
};

describe('createImageDownloader', () => {
  let server: http.Server;
  let port: number;
  let seen: Seen[];
  let privateAllowed: boolean;
  let serverClosed: string[];
  const open: ImageDownloader[] = [];

  const url = (path: string) => `http://img.test:${port}${path}`;

  const png = (res: http.ServerResponse, body: Buffer = PNG) => {
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(body);
  };

  const redirect = (res: http.ServerResponse, to: string, status = 302) => {
    res.writeHead(status, { location: to });
    res.end();
  };

  const routes: Record<
    string,
    (req: http.IncomingMessage, res: http.ServerResponse) => void
  > = {
    '/ok.png': (_req, res) => png(res),
    '/params.png': (_req, res) => {
      res.writeHead(200, { 'content-type': 'Image/PNG; charset=binary' });
      res.end(PNG);
    },
    '/missing': (_req, res) => {
      res.writeHead(404);
      res.end('no');
    },
    '/boom': (_req, res) => {
      res.writeHead(500);
      res.end('no');
    },
    '/page': (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html></html>');
    },
    '/no-type': (_req, res) => {
      res.writeHead(200);
      res.end(PNG);
    },
    '/svg': (_req, res) => {
      res.writeHead(200, { 'content-type': 'image/svg+xml' });
      res.end('<svg onload="alert(1)"/>');
    },
    '/bmp': (_req, res) => {
      res.writeHead(200, { 'content-type': 'image/bmp' });
      res.end(PNG);
    },
    '/empty': (_req, res) => {
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end();
    },
    // redirects
    '/r3': (_req, res) => redirect(res, '/r2'),
    '/r2': (_req, res) => redirect(res, '/r1'),
    '/r1': (_req, res) => redirect(res, '/ok.png', 301),
    '/r4': (_req, res) => redirect(res, '/r3'),
    '/relative': (_req, res) => redirect(res, 'ok.png', 307),
    '/loop': (_req, res) => redirect(res, '/loop'),
    '/no-location': (_req, res) => {
      res.writeHead(302);
      res.end();
    },
    '/to-ftp': (_req, res) => redirect(res, 'ftp://example.com/a.png'),
    '/to-credentials': (_req, res) =>
      redirect(res, `http://user:pw@img.test:${port}/ok.png`),
    // The first hop was allowed; from now on private addresses are not.
    '/to-private-name': (_req, res) => {
      privateAllowed = false;
      redirect(res, '/ok.png');
    },
    '/to-private-literal': (_req, res) => {
      privateAllowed = false;
      redirect(res, `http://127.0.0.1:${port}/ok.png`);
    },
    '/to-metadata': (_req, res) => {
      privateAllowed = false;
      redirect(res, 'http://169.254.169.254/latest/meta-data/');
    },
    // sizes
    '/exact': (_req, res) => png(res, Buffer.alloc(LIMIT, 1)),
    '/over-by-one': (_req, res) => png(res, Buffer.alloc(LIMIT + 1, 1)),
    '/declared-huge': (req, res) => {
      res.writeHead(200, {
        'content-type': 'image/png',
        'content-length': String(LIMIT * 1000)
      });
      // The headers go out now; no body follows, and the answer must not wait
      // for one.
      res.flushHeaders();
      req.socket.on('close', () => serverClosed.push('declared-huge'));
    },
    '/stream-huge': (_req, res) => {
      res.writeHead(200, { 'content-type': 'image/png' });
      const timer = setInterval(() => res.write(Buffer.alloc(300, 2)), 5);
      res.on('close', () => {
        clearInterval(timer);
        serverClosed.push('stream-huge');
      });
    },
    '/jpeg-bigger-limit': (_req, res) => {
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      res.end(Buffer.alloc(LIMIT * 2, 3));
    },
    '/jpeg-too-big': (_req, res) => {
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      res.end(Buffer.alloc(LIMIT * 2 + 1, 3));
    },
    '/gzip-bomb': (_req, res) => {
      res.writeHead(200, {
        'content-type': 'image/png',
        'content-encoding': 'gzip'
      });
      res.end(zlib.gzipSync(Buffer.alloc(LIMIT * 500, 0)));
    },
    // time
    '/hang': () => undefined,
    '/drip': (_req, res) => {
      res.writeHead(200, { 'content-type': 'image/png' });
      const timer = setInterval(() => res.write('x'), 20);
      res.on('close', () => clearInterval(timer));
    },
    // HEAD
    '/head-405': (req, res) => {
      if (req.method === 'HEAD') {
        res.writeHead(405);
        res.end();
      } else {
        res.writeHead(206, { 'content-type': 'image/png' });
        res.end(PNG.subarray(0, 1));
      }
    },
    '/head-501': (req, res) => {
      if (req.method === 'HEAD') {
        res.writeHead(501);
        res.end();
      } else {
        png(res);
      }
    },
    '/head-405-endless': (req, res) => {
      if (req.method === 'HEAD') {
        res.writeHead(405);
        res.end();
      } else {
        res.writeHead(206, { 'content-type': 'image/png' });
        const timer = setInterval(() => res.write(Buffer.alloc(100, 1)), 5);
        res.on('close', () => clearInterval(timer));
      }
    },
    '/declared-exact': (_req, res) => {
      res.writeHead(200, {
        'content-type': 'image/png',
        'content-length': String(LIMIT)
      });
      res.end(Buffer.alloc(LIMIT, 1));
    },
    '/declared-over-by-one': (req, res) => {
      res.writeHead(200, {
        'content-type': 'image/png',
        'content-length': String(LIMIT + 1)
      });
      res.flushHeaders();
      req.socket.on('close', () => serverClosed.push('declared-over-by-one'));
    },
    '/head-404': (_req, res) => {
      res.writeHead(404);
      res.end();
    },
    '/head-403': (req, res) => {
      res.writeHead(req.method === 'HEAD' ? 403 : 200, {
        'content-type': 'image/png'
      });
      res.end();
    }
  };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      seen.push({ method: req.method, url: req.url, headers: req.headers });
      const route = routes[req.url ?? ''];
      if (route) {
        route(req, res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    seen = [];
    serverClosed = [];
    privateAllowed = true;
  });

  afterEach(async () => {
    while (open.length > 0) {
      await open.pop()?.close();
    }
  });

  const make = (overrides: Partial<ImageDownloaderOptions> = {}) => {
    const downloader = createImageDownloader({
      allowPrivate: () => privateAllowed,
      lookup,
      timeoutMs: 5000,
      allowedTypes: () => [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ],
      maxBytesForType: (type) => (type === 'image/jpeg' ? LIMIT * 2 : LIMIT),
      ...overrides
    });
    open.push(downloader);
    return downloader;
  };

  const reasonOf = async (work: Promise<unknown>) => {
    try {
      await work;
    } catch (e) {
      return e as ImageError;
    }
    throw new Error('Expected a failure');
  };

  describe('download: the answer', () => {
    it('reads an image', async () => {
      const image = await make().download(url('/ok.png'));
      expect(image.bytes.equals(PNG)).toBe(true);
      expect(image.contentType).toBe('image/png');
      expect(image.finalUrl).toBe(url('/ok.png'));
    });

    it('reads the type without its parameters and in lower case', async () => {
      expect((await make().download(url('/params.png'))).contentType).toBe(
        'image/png'
      );
    });

    it('asks for an image, in the identity encoding, and says who is asking', async () => {
      await make().download(url('/ok.png'));
      expect(seen).toHaveLength(1);
      expect(seen[0].method).toBe('GET');
      expect(seen[0].headers['accept-encoding']).toBe('identity');
      expect(seen[0].headers.accept).toBe('image/*');
      expect(seen[0].headers['user-agent']).toBe('EverShop-Import');
      expect(seen[0].headers.host).toBe(`img.test:${port}`);
    });

    it.each([
      ['/missing', 404],
      ['/boom', 500]
    ])('fails with http_status for %s', async (path, status) => {
      const error = await reasonOf(make().download(url(path)));
      expect(error.reason).toBe('http_status');
      expect(error.params).toEqual({ status });
    });

    it('fails with not_an_image for a page, and for an answer that does not say what it is', async () => {
      const page = await reasonOf(make().download(url('/page')));
      expect([page.reason, page.params]).toEqual([
        'not_an_image',
        { contentType: 'text/html' }
      ]);
      const none = await reasonOf(make().download(url('/no-type')));
      expect([none.reason, none.params]).toEqual([
        'not_an_image',
        { contentType: null }
      ]);
    });

    it('refuses SVG, even when the store accepts it', async () => {
      const downloader = make({
        allowedTypes: () => ['image/png', 'image/svg+xml']
      });
      const error = await reasonOf(downloader.download(url('/svg')));
      expect([error.reason, error.params]).toEqual([
        'type_not_allowed',
        { contentType: 'image/svg+xml' }
      ]);
    });

    it('refuses a type of image the store does not accept', async () => {
      const error = await reasonOf(make().download(url('/bmp')));
      expect([error.reason, error.params]).toEqual([
        'type_not_allowed',
        { contentType: 'image/bmp' }
      ]);
    });

    it('fails with empty for an image with no bytes', async () => {
      expect((await reasonOf(make().download(url('/empty')))).reason).toBe(
        'empty'
      );
    });
  });

  describe('download: redirects (§ 10)', () => {
    it('follows a redirect, also to a relative address', async () => {
      const image = await make().download(url('/relative'));
      expect(image.finalUrl).toBe(url('/ok.png'));
      expect(seen.map((s) => s.url)).toEqual(['/relative', '/ok.png']);
    });

    it('follows three redirects and no more', async () => {
      const three = await make().download(url('/r3'));
      expect(three.finalUrl).toBe(url('/ok.png'));
      expect(seen).toHaveLength(4);
      seen = [];
      const error = await reasonOf(make().download(url('/r4')));
      expect([error.reason, error.params]).toEqual([
        'too_many_redirects',
        { max: 3 }
      ]);
      expect(seen).toHaveLength(4);
    });

    it('stops a redirect loop', async () => {
      expect((await reasonOf(make().download(url('/loop')))).reason).toBe(
        'too_many_redirects'
      );
    });

    it('fails with http_status when a redirect has no Location', async () => {
      const error = await reasonOf(make().download(url('/no-location')));
      expect([error.reason, error.params]).toEqual([
        'http_status',
        { status: 302 }
      ]);
    });

    it.each([['/to-ftp'], ['/to-credentials']])(
      'fails with invalid_url when %s redirects to an address that cannot be read',
      async (path) => {
        expect((await reasonOf(make().download(url(path)))).reason).toBe(
          'invalid_url'
        );
        expect(seen).toHaveLength(1);
      }
    );

    it.each([
      ['a name that now resolves to a private address', '/to-private-name'],
      ['an IP literal', '/to-private-literal'],
      ['the cloud metadata address', '/to-metadata']
    ])(
      'checks every hop: %s is refused after a first hop that was allowed',
      async (_name, path) => {
        const error = await reasonOf(make().download(url(path)));
        expect(error.reason).toBe('blocked');
        // The first request was made; the redirected one was not.
        expect(seen.map((s) => s.url)).toEqual([path]);
      }
    );
  });

  describe('download: the size', () => {
    it('accepts exactly the limit and refuses one byte more', async () => {
      expect((await make().download(url('/exact'))).bytes.length).toBe(LIMIT);
      const error = await reasonOf(make().download(url('/over-by-one')));
      expect([error.reason, error.params]).toEqual([
        'too_large',
        { contentType: 'image/png', maxMb: LIMIT / 1_048_576 }
      ]);
    });

    it('judges the declared size on the same line as the body: exactly the limit passes, one byte more does not', async () => {
      expect((await make().download(url('/declared-exact'))).bytes.length).toBe(
        LIMIT
      );
      const error = await reasonOf(
        make().download(url('/declared-over-by-one'))
      );
      expect(error.reason).toBe('too_large');
    });

    it('uses the limit of the type', async () => {
      const image = await make().download(url('/jpeg-bigger-limit'));
      expect(image.bytes.length).toBe(LIMIT * 2);
      expect(
        (await reasonOf(make().download(url('/jpeg-too-big')))).reason
      ).toBe('too_large');
    });

    it('refuses an image whose declared size is over the limit without waiting for the body', async () => {
      const started = Date.now();
      const error = await reasonOf(make().download(url('/declared-huge')));
      expect(error.reason).toBe('too_large');
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it('stops reading and closes the connection when a body without a size goes past the limit', async () => {
      const error = await reasonOf(make().download(url('/stream-huge')));
      expect(error.reason).toBe('too_large');
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(serverClosed).toContain('stream-huge');
    });

    it('counts the bytes after a compressed answer is unpacked (a compression bomb)', async () => {
      const error = await reasonOf(make().download(url('/gzip-bomb')));
      expect(error.reason).toBe('too_large');
    });
  });

  describe('download: time and the network', () => {
    it('fails with timeout when the server does not answer', async () => {
      const error = await reasonOf(
        make({ timeoutMs: 150 }).download(url('/hang'))
      );
      expect(error.reason).toBe('timeout');
    });

    it('fails with timeout when the body never ends: the deadline is for the whole image', async () => {
      const error = await reasonOf(
        make({ timeoutMs: 300 }).download(url('/drip'))
      );
      expect(error.reason).toBe('timeout');
    });

    it('fails with network and the code when nothing listens', async () => {
      const free = http.createServer();
      await new Promise<void>((resolve) =>
        free.listen(0, '127.0.0.1', resolve)
      );
      const closedPort = (free.address() as AddressInfo).port;
      await new Promise<void>((resolve) => free.close(() => resolve()));
      const error = await reasonOf(
        make().download(`http://img.test:${closedPort}/a.png`)
      );
      expect([error.reason, error.params]).toEqual([
        'network',
        { code: 'ECONNREFUSED' }
      ]);
    });

    it('fails with network when the name does not resolve', async () => {
      const failing: LookupFunction = (_h, _o, callback) =>
        callback(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }), []);
      const error = await reasonOf(
        make({ lookup: failing }).download(url('/ok.png'))
      );
      expect([error.reason, error.params]).toEqual([
        'network',
        { code: 'ENOTFOUND' }
      ]);
    });
  });

  describe('the deadline timer', () => {
    it('is cleared when the image is done, whether it worked or not, so that it does not keep the process alive', async () => {
      const delay = 4321;
      const started: unknown[] = [];
      const cleared: unknown[] = [];
      const realSet = globalThis.setTimeout;
      const realClear = globalThis.clearTimeout;
      globalThis.setTimeout = ((
        fn: () => void,
        ms?: number,
        ...args: unknown[]
      ) => {
        const handle = realSet(fn, ms, ...args);
        if (ms === delay) started.push(handle);
        return handle;
      }) as typeof setTimeout;
      globalThis.clearTimeout = ((
        handle?: Parameters<typeof clearTimeout>[0]
      ) => {
        cleared.push(handle);
        return realClear(handle);
      }) as typeof clearTimeout;
      try {
        const downloader = make({ timeoutMs: delay });
        await downloader.download(url('/ok.png'));
        await downloader.download(url('/missing')).catch(() => undefined);
        await downloader.probe(url('/ok.png'));
      } finally {
        globalThis.setTimeout = realSet;
        globalThis.clearTimeout = realClear;
      }
      expect(started).toHaveLength(3);
      for (const handle of started) {
        expect(cleared).toContain(handle);
      }
    });
  });

  describe('download: private addresses are refused unless the switch is on', () => {
    beforeEach(() => {
      privateAllowed = false;
    });

    it('refuses an IP literal', async () => {
      const error = await reasonOf(
        make().download(`http://127.0.0.1:${port}/ok.png`)
      );
      expect(error.reason).toBe('blocked');
      expect(seen).toHaveLength(0);
    });

    it('refuses the cloud metadata address', async () => {
      const error = await reasonOf(
        make().download('http://169.254.169.254/latest/meta-data/')
      );
      expect(error.reason).toBe('blocked');
    });

    it('refuses a name that resolves to a private address, and makes no request', async () => {
      const error = await reasonOf(make().download(url('/ok.png')));
      expect(error.reason).toBe('blocked');
      expect(seen).toHaveLength(0);
    });

    it('refuses localhost', async () => {
      const error = await reasonOf(
        make({ lookup: undefined }).download(`http://localhost:${port}/ok.png`)
      );
      expect(error.reason).toBe('blocked');
      expect(seen).toHaveLength(0);
    });

    it('refuses NAT64 and 6to4 forms of a private address', async () => {
      for (const host of ['[64:ff9b::7f00:1]', '[2002:7f00:1::]']) {
        const error = await reasonOf(
          make().download(`http://${host}:${port}/ok.png`)
        );
        expect(error.reason).toBe('blocked');
      }
    });

    it('lets an IP literal through when the switch is on (the end-to-end suite serves from localhost)', async () => {
      privateAllowed = true;
      const image = await make().download(`http://127.0.0.1:${port}/ok.png`);
      expect(image.contentType).toBe('image/png');
    });

    it('reads the switch for every request', async () => {
      const downloader = make();
      expect((await reasonOf(downloader.download(url('/ok.png')))).reason).toBe(
        'blocked'
      );
      privateAllowed = true;
      expect((await downloader.download(url('/ok.png'))).contentType).toBe(
        'image/png'
      );
    });
  });

  describe('download: addresses that cannot be read', () => {
    it.each([
      ['ftp://example.com/a.png'],
      ['file:///etc/passwd'],
      ['https://user:pw@example.com/a.png'],
      ['//example.com/a.png'],
      ['not a url'],
      ['']
    ])('fails with invalid_url for %j', async (text) => {
      expect((await reasonOf(make().download(text))).reason).toBe(
        'invalid_url'
      );
      expect(seen).toHaveLength(0);
    });
  });

  describe('probe (IMG-05)', () => {
    it('asks with HEAD and does not read the body', async () => {
      await make().probe(url('/ok.png'));
      expect(seen.map((s) => s.method)).toEqual(['HEAD']);
    });

    it.each([['/head-405'], ['/head-501']])(
      'asks for the first byte with GET when the server refuses HEAD (%s)',
      async (path) => {
        await make().probe(url(path));
        expect(seen.map((s) => s.method)).toEqual(['HEAD', 'GET']);
        expect(seen[1].headers.range).toBe('bytes=0-0');
      }
    );

    it('does not read the body of the answer to the GET, however long it is', async () => {
      const started = Date.now();
      await make().probe(url('/head-405-endless'));
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it('does not ask again when HEAD is refused for another reason', async () => {
      const error = await reasonOf(make().probe(url('/head-403')));
      expect([error.reason, error.params]).toEqual([
        'http_status',
        { status: 403 }
      ]);
      expect(seen.map((s) => s.method)).toEqual(['HEAD']);
    });

    it('fails like a download: status, type, private address, redirects, time', async () => {
      expect((await reasonOf(make().probe(url('/head-404')))).reason).toBe(
        'http_status'
      );
      expect((await reasonOf(make().probe(url('/page')))).reason).toBe(
        'not_an_image'
      );
      expect((await reasonOf(make().probe(url('/r4')))).reason).toBe(
        'too_many_redirects'
      );
      expect(
        (await reasonOf(make({ timeoutMs: 150 }).probe(url('/hang')))).reason
      ).toBe('timeout');
      privateAllowed = false;
      expect((await reasonOf(make().probe(url('/ok.png')))).reason).toBe(
        'blocked'
      );
    });

    it('follows redirects', async () => {
      await make().probe(url('/r3'));
      expect(seen).toHaveLength(4);
    });
  });
});
