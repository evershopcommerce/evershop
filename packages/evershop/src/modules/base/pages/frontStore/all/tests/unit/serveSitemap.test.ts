import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { getSitemapConfig } from '../../../../../services/sitemap/config.js';
import { ensureSitemap } from '../../../../../services/sitemap/ensureSitemap.js';
import { createLocalSitemapStorage } from '../../../../../services/sitemap/storage.js';
import { SitemapCollector } from '../../../../../services/sitemap/types.js';
import {
  ServeSitemapDeps,
  serveSitemapRequest
} from '../../serveSitemap.js';

function makeReq(over: Record<string, unknown> = {}): any {
  return {
    method: 'GET',
    originalUrl: '/sitemap.xml',
    currentRoute: { id: 'notFound' },
    ...over
  };
}

function makeRes(): any {
  const headers: Record<string, string> = {};
  const res: any = {
    headers,
    body: undefined,
    statusCode: undefined,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    set: jest.fn((key: string, value: string) => {
      headers[key] = value;
      return res;
    }),
    send: jest.fn((body: unknown) => {
      res.body = body;
      return res;
    })
  };
  return res;
}

function makeDeps(over: Partial<ServeSitemapDeps> = {}): ServeSitemapDeps {
  return {
    ensureSitemap: jest.fn(async () => Buffer.from('<sitemapindex/>')),
    getConfig: () => getSitemapConfig(),
    getRobotsOverride: async () => null,
    getBaseUrl: () => 'https://shop.com',
    ...over
  };
}

describe('serveSitemapRequest — gating', () => {
  it('passes through when the request matched a real route', async () => {
    const req = makeReq({ currentRoute: { id: 'productView' } });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, makeDeps());
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
  });

  it('passes through for non-GET/HEAD methods', async () => {
    const req = makeReq({ method: 'POST', originalUrl: '/sitemap.xml' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, makeDeps());
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
  });

  it('passes through for an unrelated 404 path', async () => {
    const req = makeReq({ originalUrl: '/nope' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, makeDeps());
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('serveSitemapRequest — sitemap files', () => {
  it('serves /sitemap.xml as application/xml and does not call next', async () => {
    const ensure = jest.fn(async () => Buffer.from('<sitemapindex/>'));
    const req = makeReq({ originalUrl: '/sitemap.xml' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, makeDeps({ ensureSitemap: ensure }));
    expect(ensure).toHaveBeenCalledWith('sitemap.xml');
    expect(res.statusCode).toBe(200); // overrides the notFound 404
    expect(res.headers['Content-Type']).toBe('application/xml; charset=utf-8');
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('serves a child file by its full name', async () => {
    const ensure = jest.fn(async () => Buffer.from('<urlset/>'));
    const req = makeReq({ originalUrl: '/sitemap-products.xml' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, makeDeps({ ensureSitemap: ensure }));
    expect(ensure).toHaveBeenCalledWith('sitemap-products.xml');
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('falls through to 404 when generation does not produce the file', async () => {
    const req = makeReq({ originalUrl: '/sitemap-unknown.xml' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(
      req,
      res,
      next,
      makeDeps({ ensureSitemap: async () => null })
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
  });

  it('passes through sitemap files when the feature is disabled', async () => {
    const req = makeReq({ originalUrl: '/sitemap.xml' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(
      req,
      res,
      next,
      makeDeps({ getConfig: () => ({ ...getSitemapConfig(), enabled: false }) })
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('propagates a generation error via next(err)', async () => {
    const boom = new Error('boom');
    const req = makeReq({ originalUrl: '/sitemap.xml' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(
      req,
      res,
      next,
      makeDeps({
        ensureSitemap: async () => {
          throw boom;
        }
      })
    );
    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe('serveSitemapRequest — robots.txt', () => {
  it('serves a dynamic default with an absolute Sitemap line', async () => {
    const req = makeReq({ originalUrl: '/robots.txt' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, makeDeps());
    expect(res.statusCode).toBe(200); // overrides the notFound 404
    expect(res.headers['Content-Type']).toBe('text/plain; charset=utf-8');
    const body = res.body as string;
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Disallow: /admin/');
    expect(body).toContain('Sitemap: https://shop.com/sitemap.xml');
    expect(next).not.toHaveBeenCalled();
  });

  it('serves the robotsTxt setting override verbatim (setting > default)', async () => {
    const req = makeReq({ originalUrl: '/robots.txt' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(
      req,
      res,
      next,
      makeDeps({ getRobotsOverride: async () => 'User-agent: *\nDisallow: /secret' })
    );
    expect(res.body).toBe('User-agent: *\nDisallow: /secret');
    expect(res.body).not.toContain('/admin/');
  });

  it('omits the Sitemap line when the feature is disabled', async () => {
    const req = makeReq({ originalUrl: '/robots.txt' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(
      req,
      res,
      next,
      makeDeps({ getConfig: () => ({ ...getSitemapConfig(), enabled: false }) })
    );
    expect(res.body as string).not.toContain('Sitemap:');
    expect(res.body as string).toContain('Disallow: /admin/');
  });

  it('passes through when robots is disabled', async () => {
    const req = makeReq({ originalUrl: '/robots.txt' });
    const res = makeRes();
    const next = jest.fn();
    const config = getSitemapConfig();
    await serveSitemapRequest(req, res, next, makeDeps({
      getConfig: () => ({ ...config, robots: { ...config.robots, enabled: false } })
    }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
  });

  it('matches the canonical path for a locale-prefixed request (/de/robots.txt)', async () => {
    // The locale middleware strips the prefix into request.localePath.
    const req = makeReq({ originalUrl: '/de/robots.txt', localePath: '/robots.txt' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, makeDeps());
    expect(res.body as string).toContain('Sitemap: https://shop.com/sitemap.xml');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('serveSitemapRequest — integration (real ensureSitemap + temp storage)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sitemap-serve-'));
  });

  it('generates on a cold cache and serves the real index bytes', async () => {
    const storage = createLocalSitemapStorage({
      publicDir: path.join(dir, 'public'),
      cacheDir: path.join(dir, 'cache')
    });
    const collector: SitemapCollector = {
      name: 'products',
      async collect() {
        return [{ path: '/a', lastmod: '2026-01-01T00:00:00.000Z' }];
      },
      async getFingerprint() {
        return { count: 1, maxUpdatedAt: '2026-01-01T00:00:00.000Z' };
      }
    };
    const deps = makeDeps({
      ensureSitemap: (fileName) =>
        ensureSitemap(fileName, {
          storage,
          collectors: [collector],
          config: getSitemapConfig(),
          baseUrl: 'https://shop.com',
          locales: ['en'],
          defaultLocale: 'en',
          clock: () => 1
        })
    });

    const req = makeReq({ originalUrl: '/sitemap.xml' });
    const res = makeRes();
    const next = jest.fn();
    await serveSitemapRequest(req, res, next, deps);

    const body = (res.body as Buffer).toString();
    expect(body).toContain('<sitemapindex');
    expect(body).toContain('https://shop.com/sitemap-products.xml');
    expect(await storage.fileExists('sitemap-products.xml')).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});
