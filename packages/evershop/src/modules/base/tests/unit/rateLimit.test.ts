import type { AddressInfo } from 'net';
import express from 'express';
import { classifyRequest, rateLimiter } from '../../services/rateLimit.js';

describe('classifyRequest', () => {
  it.each([
    // Pages
    ['GET', '/', 'page'],
    ['GET', '/products', 'page'],
    ['GET', '/admin/dashboard', 'page'],
    ['GET', '/account/login', 'page'], // login PAGE render, not the credential POST
    // API
    ['GET', '/api/products', 'api'],
    ['POST', '/api/carts/mine/items', 'api'],
    ['GET', '/api/customers', 'api'], // listing customers is not the auth tier
    // Auth (strict, POST only)
    ['POST', '/customer/login', 'auth'],
    ['POST', '/fr/customer/login', 'auth'], // locale-prefixed storefront login
    ['POST', '/en-US/customer/login', 'auth'],
    ['POST', '/admin/user/login', 'auth'],
    ['POST', '/api/customers', 'auth'], // registration
    ['POST', '/api/customers/reset-password', 'auth'],
    ['POST', '/api/customers/password', 'auth'],
    // Exempt (assets / dev / health)
    ['GET', '/assets/app.js', 'exempt'],
    ['GET', '/logo.png', 'exempt'],
    ['GET', '/main.hot-update.json', 'exempt'],
    ['GET', '/__webpack_hmr_frontstore', 'exempt'],
    ['GET', '/backend/bundle.js', 'exempt'],
    ['GET', '/health', 'exempt']
  ] as Array<[string, string, string]>)(
    '%s %s -> %s',
    (method, path, expected) => {
      expect(classifyRequest(method, path)).toBe(expected);
    }
  );
});

describe('rateLimiter behaviour', () => {
  it('returns 429 once the auth-tier limit is exceeded from one IP', async () => {
    const app = express();
    app.use(rateLimiter);
    app.all('*', (_req, res) => res.status(200).send('ok'));
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const codes: number[] = [];
      // auth tier limit is 8; fire 9 identical POSTs from the same loopback IP.
      for (let i = 0; i < 9; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(`${base}/customer/login`, {
          method: 'POST'
        });
        codes.push(response.status);
      }
      expect(codes.slice(0, 8)).toEqual(Array(8).fill(200));
      expect(codes[8]).toBe(429);
    } finally {
      server.close();
    }
  });
});
