import http from 'http';
import { AddressInfo } from 'net';
import { fetch as undiciFetch } from 'undici';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createGuardedAgent } from '../../guardedAgent.js';
import type { LookupFunction } from '../../guardedLookup.js';

/**
 * The guard on a real connection: a name that the (fake) DNS resolves to the
 * address of a local server. The name is what a user writes in a URL; the
 * address is what the connection goes to.
 */
describe('createGuardedAgent', () => {
  let server: http.Server;
  let port: number;
  const resolved: string[] = [];

  const lookup: LookupFunction = (hostname, _options, callback) => {
    resolved.push(hostname);
    callback(null, [{ address: '127.0.0.1', family: 4 }]);
  };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.end(`host=${req.headers.host}`);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('refuses a name that resolves to a private address', async () => {
    const agent = createGuardedAgent({ allowPrivate: () => false, lookup });
    const attempt = undiciFetch(`http://rebinding.test:${port}/`, {
      dispatcher: agent
    });
    await expect(attempt).rejects.toMatchObject({
      cause: { code: 'EBLOCKED' }
    });
    await agent.close();
  });

  it('connects to the address that the lookup returned, when private networks are allowed', async () => {
    resolved.length = 0;
    const agent = createGuardedAgent({ allowPrivate: () => true, lookup });
    const response = await undiciFetch(`http://rebinding.test:${port}/`, {
      dispatcher: agent
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(`host=rebinding.test:${port}`);
    expect(resolved).toEqual(['rebinding.test']);
    await agent.close();
  });
});
