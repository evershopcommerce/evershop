import { existsSync, readFileSync, readdirSync } from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import express from 'express';
import { parseRoute } from '../../../../../lib/router/scanForRoutes.js';
import { getRouteFromPath } from '../../../../../lib/middleware/getRouteFromPath.js';
import { scanForMiddlewareFunctions } from '../../../../../lib/middleware/scanForMiddlewareFunctions.js';
import { sortRoutes } from '../../../../../lib/router/sortRoutes.js';

/**
 * The routes of § 8.3. The route ids are the permission set (§ 8.7): core's role
 * allow-list works on route ids, so renaming one locks out the users who have
 * it. This test fixes the list.
 */
const API = fileURLToPath(new URL('../../../api/', import.meta.url));

const ROUTES: Array<
  [id: string, method: string, path: string, writes: boolean]
> = [
  ['createImportJob', 'POST', '/import-jobs', true],
  ['getImportJob', 'GET', '/import-jobs/:id', false],
  ['getImportIssues', 'GET', '/import-jobs/:id/issues', false],
  [
    'downloadFileWithErrors',
    'GET',
    '/import-jobs/:id/file-with-errors.csv',
    false
  ],
  ['downloadImportTemplate', 'GET', '/import-templates/:entity', false],
  ['startImportJob', 'POST', '/import-jobs/:id/start', true],
  ['cancelImportJob', 'POST', '/import-jobs/:id/cancel', true],
  ['resumeImportJob', 'POST', '/import-jobs/:id/resume', true],
  ['recheckImportJob', 'POST', '/import-jobs/:id/recheck', true],
  ['listOpenImportJobs', 'GET', '/import-open-jobs', false],
  ['deleteImportJob', 'DELETE', '/import-jobs/:id', true]
];

describe('the routes of the import API', () => {
  it('are exactly the routes of § 8.3, and nothing else is a route', () => {
    const folders = readdirSync(API).filter((name) =>
      existsSync(`${API}${name}/route.json`)
    );
    expect(folders.sort()).toEqual(ROUTES.map(([id]) => id).sort());
  });

  it.each(ROUTES)(
    '%s is %s %s, private, as core will read it',
    (id, method, path) => {
      const route = parseRoute(`${API}${id}/route.json`, false, true);
      expect(route).toMatchObject({
        id,
        method: [method],
        path: `/api${path}`,
        isApi: true,
        isAdmin: false,
        access: 'private'
      });
      expect(
        JSON.parse(readFileSync(`${API}${id}/route.json`, 'utf8'))
      ).toEqual({
        methods: [method],
        path,
        access: 'private'
      });
    }
  );

  it.each(ROUTES)(
    '%s has a handler with the three arguments that make it active',
    async (id) => {
      const handler = (await import(`../../../api/${id}/${id}.js`)).default;
      expect(typeof handler).toBe('function');
      // With two arguments the framework calls next() after it, and the answer
      // would be sent twice (ERR_HTTP_HEADERS_SENT).
      expect(handler.length).toBe(3);
    }
  );

  it('are found by the path, each by one route', async () => {
    const routes = sortRoutes(
      ROUTES.map(([id, method, path]) => ({ id, method, path: `/api${path}` }))
    );
    const app = express();
    for (const route of routes) {
      app[route.method.toLowerCase() as 'get'](
        route.path,
        (request, response) => {
          response.json({ id: route.id, params: request.params });
        }
      );
    }
    const server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    const call = (method: string, path: string) =>
      new Promise<any>((resolve, reject) => {
        http
          .request({ host: '127.0.0.1', port, method, path }, (response) => {
            let text = '';
            response.on('data', (chunk) => {
              text += chunk;
            });
            response.on('end', () => resolve(JSON.parse(text)));
          })
          .on('error', reject)
          .end();
      });
    try {
      const uuid = '11111111-2222-4333-8444-555555555555';
      expect((await call('GET', '/api/import-open-jobs')).id).toBe(
        'listOpenImportJobs'
      );
      expect(await call('GET', `/api/import-jobs/${uuid}`)).toEqual({
        id: 'getImportJob',
        params: { id: uuid }
      });
      expect((await call('GET', `/api/import-jobs/${uuid}/issues`)).id).toBe(
        'getImportIssues'
      );
      expect(
        await call('GET', `/api/import-jobs/${uuid}/file-with-errors.csv`)
      ).toEqual({
        id: 'downloadFileWithErrors',
        params: { id: uuid }
      });
      expect((await call('POST', '/api/import-jobs')).id).toBe(
        'createImportJob'
      );
      expect((await call('POST', `/api/import-jobs/${uuid}/start`)).id).toBe(
        'startImportJob'
      );
      expect((await call('POST', `/api/import-jobs/${uuid}/cancel`)).id).toBe(
        'cancelImportJob'
      );
      expect((await call('POST', `/api/import-jobs/${uuid}/resume`)).id).toBe(
        'resumeImportJob'
      );
      expect((await call('POST', `/api/import-jobs/${uuid}/recheck`)).id).toBe(
        'recheckImportJob'
      );
      expect((await call('DELETE', `/api/import-jobs/${uuid}`)).id).toBe(
        'deleteImportJob'
      );
    } finally {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });
});

describe('the header that guards the routes that change an import', () => {
  const WRITES = ROUTES.filter(([, , , writes]) => writes).map(([id]) => id);
  const GUARD = '[context]importRequestHeader[auth].js';

  it('has no folder shared by several routes: core reads an API folder as one route', () => {
    // A folder named `a+b` is a page's way to share a file; for an API it names a
    // route that does not exist, and the guard in it never ran (found on a live store).
    expect(readdirSync(API).filter((name) => name.includes('+'))).toEqual([]);
  });

  it.each(ROUTES)(
    '%s: the guard is in its folder if it changes an import, and not if it only reads',
    (id, _method, _path, writes) => {
      expect(existsSync(`${API}${id}/${GUARD}`)).toBe(writes);
    }
  );

  it('is found by core’s own loader for each of those routes, under that route and no other', () => {
    const found: Array<[string, string | null]> = [];
    for (const [id] of ROUTES) {
      const folder = `${API}${id}`;
      for (const middleware of scanForMiddlewareFunctions(folder)) {
        if (middleware.id !== 'importRequestHeader') continue;
        const route = getRouteFromPath(middleware.path);
        expect(route.region).toBe('api');
        found.push([id, route.routeId]);
      }
    }
    // the route that core gives the guard is the route of its folder
    expect(found.sort()).toEqual(WRITES.map((id) => [id, id]).sort());
  });

  it('runs before the authentication, like the body parser', async () => {
    const [middleware] = scanForMiddlewareFunctions(
      `${API}startImportJob`
    ).filter((m: { id: string }) => m.id === 'importRequestHeader');
    expect(middleware.after).toEqual(['context']);
    expect(middleware.before).toEqual(['auth']);
  });

  const guard = async (route = 'startImportJob') =>
    (await import(`../../../api/${route}/${GUARD}`)).default;
  const call = async (header: string | undefined, route?: string) => {
    const sent: Array<{ status?: number; body?: any }> = [{}];
    let nexted = 0;
    const response: any = {
      status(code: number) {
        sent[0].status = code;
        return response;
      },
      json(body: unknown) {
        sent[0].body = body;
      }
    };
    (await guard(route))(
      {
        get: (name: string) =>
          name === 'X-Import-Request' ? header : undefined
      },
      response,
      () => {
        nexted += 1;
      }
    );
    return { sent: sent[0], nexted };
  };

  it('lets a request through that has X-Import-Request: 1', async () => {
    expect(await call('1')).toEqual({ sent: {}, nexted: 1 });
  });

  it.each([[undefined], [''], ['0'], ['true'], ['11'], [' 1']])(
    'refuses a request with the header %j, with a 400 and the code, and does not go on',
    async (header) => {
      const { sent, nexted } = await call(header);
      expect(nexted).toBe(0);
      expect(sent.status).toBe(400);
      expect(sent.body.error).toMatchObject({
        status: 400,
        code: 'INVALID_REQUEST'
      });
    }
  );

  it.each(WRITES)('%s hands over to the same guard', async (route) => {
    expect((await call(undefined, route)).sent.status).toBe(400);
    expect((await call('1', route)).nexted).toBe(1);
  });

  it('is a function of three arguments, so that core waits for next() (it never answers a request twice)', async () => {
    expect((await guard()).length).toBe(3);
  });
});
