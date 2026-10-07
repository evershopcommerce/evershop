import http from 'http';
import { AddressInfo } from 'net';
import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach
} from '@jest/globals';

// Toggle the config opt-in per test.
const config = { allowPrivate: false };
jest.unstable_mockModule('../../../../lib/util/getConfig.js', () => ({
  getConfig: (path: string, fallback: unknown) =>
    path === 'system.webhook.allowPrivateNetworks'
      ? config.allowPrivate
      : fallback
}));

const { postWebhook, describeFetchError } = await import(
  '../../services/webhookFetch.js'
);

type Seen = { method?: string; headers: http.IncomingHttpHeaders; body: string };

describe('postWebhook', () => {
  let server: http.Server;
  let port: number;
  let seen: Seen[];
  let respond: (res: http.ServerResponse) => void;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        seen.push({ method: req.method, headers: req.headers, body });
        respond(res);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    seen = [];
    config.allowPrivate = false;
    respond = (res) => {
      res.statusCode = 200;
      res.end('ok');
    };
  });

  describe('with private networks allowed (local development)', () => {
    beforeEach(() => {
      config.allowPrivate = true;
    });

    it('POSTs the body and headers, and reports a 2xx as ok', async () => {
      const result = await postWebhook(
        `http://127.0.0.1:${port}/hook`,
        { 'Content-Type': 'application/json', 'X-EverShop-Topic': 'order_placed' },
        '{"a":1}'
      );

      expect(result).toEqual({ ok: true, statusCode: 200, error: null });
      expect(seen).toHaveLength(1);
      expect(seen[0].method).toBe('POST');
      expect(seen[0].body).toBe('{"a":1}');
      expect(seen[0].headers['x-evershop-topic']).toBe('order_placed');
    });

    it.each([201, 202, 204])('treats %s as success', async (status) => {
      respond = (res) => {
        res.statusCode = status;
        res.end();
      };
      const result = await postWebhook(`http://127.0.0.1:${port}/`, {}, '{}');
      expect(result.ok).toBe(true);
      expect(result.statusCode).toBe(status);
    });

    it.each([400, 404, 410, 500, 503])(
      'treats %s as a failure and keeps the status code',
      async (status) => {
        respond = (res) => {
          res.statusCode = status;
          res.end('nope');
        };
        const result = await postWebhook(`http://127.0.0.1:${port}/`, {}, '{}');
        expect(result).toEqual({ ok: false, statusCode: status, error: null });
      }
    );

    it('does NOT follow a redirect: a 302 is a failure', async () => {
      respond = (res) => {
        res.statusCode = 302;
        res.setHeader('Location', `http://127.0.0.1:${port}/elsewhere`);
        res.end();
      };

      const result = await postWebhook(`http://127.0.0.1:${port}/hook`, {}, '{}');

      expect(result.ok).toBe(false);
      expect(result.statusCode).toBe(302);
      // Only the original request reached the server.
      expect(seen).toHaveLength(1);
    });

    it('does not read the response body (a huge body does not stall it)', async () => {
      respond = (res) => {
        res.statusCode = 200;
        res.write('x'.repeat(1024 * 1024));
        // Never ends: a client that waited for the body would hang.
      };
      const result = await postWebhook(`http://127.0.0.1:${port}/`, {}, '{}');
      expect(result.ok).toBe(true);
    });

    it('reports a refused connection as ECONNREFUSED', async () => {
      const closed = http.createServer();
      await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
      const closedPort = (closed.address() as AddressInfo).port;
      await new Promise<void>((resolve) => closed.close(() => resolve()));

      const result = await postWebhook(`http://127.0.0.1:${closedPort}/`, {}, '{}');

      expect(result).toEqual({
        ok: false,
        statusCode: null,
        error: 'ECONNREFUSED'
      });
    });

    it('reports an unknown host as ENOTFOUND', async () => {
      const result = await postWebhook(
        'http://this-host-does-not-exist.invalid/',
        {},
        '{}'
      );
      expect(result.ok).toBe(false);
      expect(result.statusCode).toBeNull();
      expect(result.error).toMatch(/ENOTFOUND|EAI_AGAIN/);
    });
  });

  describe('with private networks NOT allowed (the default)', () => {
    it('blocks an IPv4 literal to loopback, and never reaches the server', async () => {
      const result = await postWebhook(`http://127.0.0.1:${port}/`, {}, '{}');

      expect(result.ok).toBe(false);
      expect(result.statusCode).toBeNull();
      expect(result.error).toContain('Blocked');
      expect(seen).toHaveLength(0);
    });

    it('blocks the cloud metadata address', async () => {
      const result = await postWebhook(
        'http://169.254.169.254/latest/meta-data/',
        {},
        '{}'
      );
      expect(result.error).toContain('Blocked');
    });

    it('blocks an IPv6 loopback literal and an IPv4-mapped one', async () => {
      expect((await postWebhook(`http://[::1]:${port}/`, {}, '{}')).error).toContain(
        'Blocked'
      );
      expect(
        (await postWebhook(`http://[::ffff:127.0.0.1]:${port}/`, {}, '{}')).error
      ).toContain('Blocked');
    });

    // The connect-time DNS guard, not the literal pre-check: `localhost` is a
    // name, so it is only caught if undici really calls our lookup.
    it('blocks a HOSTNAME that resolves to loopback, and never reaches the server', async () => {
      const result = await postWebhook(`http://localhost:${port}/`, {}, '{}');

      expect(result.ok).toBe(false);
      expect(result.statusCode).toBeNull();
      expect(result.error).toContain('Blocked');
      expect(seen).toHaveLength(0);
    });
  });
});

describe('describeFetchError', () => {
  it('describes a timeout', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(describeFetchError(abort)).toBe('Timed out after 10 seconds');
    expect(describeFetchError({ cause: { name: 'AbortError' } })).toBe(
      'Timed out after 10 seconds'
    );
  });

  it('uses the error code, from the error or its cause', () => {
    expect(describeFetchError({ code: 'ECONNRESET' })).toBe('ECONNRESET');
    expect(describeFetchError({ cause: { code: 'ENOTFOUND' } })).toBe('ENOTFOUND');
  });

  it('explains a blocked address', () => {
    expect(describeFetchError({ cause: { code: 'EBLOCKED' } })).toContain(
      'private or reserved'
    );
  });

  it('falls back to a short message', () => {
    expect(describeFetchError(new Error('something odd'))).toBe('something odd');
    expect(describeFetchError({})).toBe('Request failed');
    expect(describeFetchError(new Error('x'.repeat(500))).length).toBe(200);
  });
});
