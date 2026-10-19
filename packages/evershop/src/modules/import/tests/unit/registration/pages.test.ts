import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import express from 'express';
import { parseRoute } from '../../../../../lib/router/scanForRoutes.js';
import { sortRoutes } from '../../../../../lib/router/sortRoutes.js';

/**
 * The admin pages of the import (§ 8.1): three routes, the files in their
 * folders, and the addresses their queries ask for. Core reads a folder by the
 * first letter of a file name (a lower-case file is a middleware, an upper-case
 * one a component), so a stray helper in a page folder would run on every request.
 */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const PAGES = `${ROOT}pages/admin/`;

const PAGE_ROUTES: Array<[id: string, path: string]> = [
  ['importGrid', '/import'],
  ['importNew', '/import/new'],
  ['importView', '/import/:id']
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = `${dir}${name}`;
    return statSync(full).isDirectory() ? walk(`${full}/`) : [full];
  });

describe('the admin routes of the import', () => {
  it('are the three of § 8.1, and nothing else is a route', () => {
    const ids = readdirSync(PAGES)
      .filter((name) => existsSync(`${PAGES}${name}/route.json`))
      .sort();
    expect(ids).toEqual(PAGE_ROUTES.map(([id]) => id).sort());
  });

  it.each(PAGE_ROUTES)('%s is GET %s, for the admin, private', (id, path) => {
    const route = parseRoute(`${PAGES}${id}/route.json`, true, false);
    expect(route).toMatchObject({
      id,
      path,
      method: ['GET'],
      isAdmin: true,
      isApi: false,
      access: 'private'
    });
  });

  it('send /import/new to the new import page, not to a job called "new"', async () => {
    const routes = sortRoutes(
      PAGE_ROUTES.map(([id]) =>
        parseRoute(`${PAGES}${id}/route.json`, true, false)
      )
    );
    const app = express();
    routes.forEach((route) => {
      app.get(route!.path, (_req, res) => res.send(route!.id));
    });
    const server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as AddressInfo).port;
    const get = async (path: string) =>
      (await fetch(`http://127.0.0.1:${port}${path}`)).text();
    try {
      expect(await get('/import')).toBe('importGrid');
      expect(await get('/import/new')).toBe('importNew');
      expect(await get('/import/6f1d9a52-0000-4000-8000-000000000001')).toBe(
        'importView'
      );
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});

describe('the files of the page folders', () => {
  const folders = PAGE_ROUTES.map(([id]) => id);
  const files = folders.flatMap((id) =>
    readdirSync(`${PAGES}${id}`).map((name) => [id, name] as const)
  );

  it.each(files)(
    '%s/%s is a route file, a middleware named index, or a component',
    (id, name) => {
      const first = name[0];
      if (name === 'route.json' || /^index\.(ts|js)$/.test(name)) return;
      // Anything else must be a React component: upper-case, a .tsx (a .js once built).
      expect(first).toBe(first.toUpperCase());
      expect(name).toMatch(/\.(tsx|js)$/);
      expect(id).toBeTruthy();
    }
  );

  it('keeps the helpers outside the page folders, where core would run them as middleware', () => {
    const lower = walk(PAGES).filter((f) => {
      const name = f.split('/').pop()!;
      return (
        !/^index\.(ts|js)$/.test(name) &&
        name !== 'route.json' &&
        name[0] === name[0].toLowerCase()
      );
    });
    expect(lower).toEqual([]);
  });
});

describe('the addresses that the pages ask for', () => {
  const API = readdirSync(`${ROOT}api/`).filter((n) =>
    existsSync(`${ROOT}api/${n}/route.json`)
  );
  const known = new Set([...API, ...PAGE_ROUTES.map(([id]) => id)]);
  const sources = [...walk(PAGES), ...walk(`${ROOT}components/`)].filter((f) =>
    /\.(tsx|js)$/.test(f)
  );

  it('finds some, so that this test cannot pass by finding none', () => {
    const used = sources.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/routeId:\s*"(\w+)"/g)].map(
        (m) => m[1]
      )
    );
    expect(used.length).toBeGreaterThanOrEqual(10);
  });

  it.each(sources.map((f) => [f.replace(ROOT, '')]))(
    '%s names only routes that exist',
    (file) => {
      const used = [
        ...readFileSync(`${ROOT}${file}`, 'utf8').matchAll(
          /routeId:\s*"(\w+)"/g
        )
      ].map((m) => m[1]);
      used.forEach((id) => expect(known).toContain(id));
    }
  );

  it('gives each route the parameter that its path has', () => {
    // `params: [{key: "id", ...}]` must be the name in the route's path.
    const paths = new Map<string, string>();
    API.forEach((id) =>
      paths.set(
        id,
        JSON.parse(readFileSync(`${ROOT}api/${id}/route.json`, 'utf8')).path
      )
    );
    sources.forEach((f) => {
      const source = readFileSync(f, 'utf8');
      [
        ...source.matchAll(
          /routeId:\s*"(\w+)"(?:,\s*params:\s*\[\{key:\s*"(\w+)")?/g
        )
      ].forEach(([, id, key]) => {
        const path = paths.get(id);
        if (!path) return;
        const wants = [...path.matchAll(/:(\w+)/g)].map((m) => m[1]);
        expect(key ? [key] : []).toEqual(wants);
      });
    });
  });
});
