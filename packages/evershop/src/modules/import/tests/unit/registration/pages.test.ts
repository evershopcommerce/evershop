import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import pathToRegexp from 'path-to-regexp';
import { parseRoute } from '../../../../../lib/router/scanForRoutes.js';
import { SORT_KEYS } from '../../../adapters/importJobFilters.js';
import { IMPORT_ENTITIES } from '../../../services/types.js';
import { PLACEHOLDER_ID } from '../../../ui/uploadChoice.js';

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
  ['importView', '/import/view/:id']
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

  it('are matched one by one: no request matches two routes (core logs a warning for each one that does)', () => {
    const apiIds = readdirSync(`${ROOT}api/`).filter((name) =>
      existsSync(`${ROOT}api/${name}/route.json`)
    );
    const groups = {
      pages: PAGE_ROUTES.map(
        ([id]) => parseRoute(`${PAGES}${id}/route.json`, true, false)!
      ),
      api: apiIds.map(
        (id) => parseRoute(`${ROOT}api/${id}/route.json`, false, true)!
      )
    };
    let checked = 0;
    Object.values(groups).forEach((routes) => {
      routes.forEach((route) => {
        // A request for this route: every parameter is some text.
        const sample = route.path.replace(/:\w+/g, 'sample');
        route.method.forEach((method: string) => {
          const matched = routes
            .filter(
              (r) =>
                r.method.includes(method) &&
                pathToRegexp(r.path, []).exec(sample)
            )
            .map((r) => r.id);
          expect(matched).toEqual([route.id]);
          checked += 1;
        });
      });
    });
    expect(checked).toBeGreaterThanOrEqual(14);
  });

  it('send /import/new to the new import page, and a job to its own', () => {
    const match = (path: string) =>
      PAGE_ROUTES.filter(([, p]) => pathToRegexp(p, []).exec(path)).map(
        ([id]) => id
      );
    expect(match('/import')).toEqual(['importGrid']);
    expect(match('/import/new')).toEqual(['importNew']);
    expect(match('/import/view/6f1d9a52-0000-4000-8000-000000000001')).toEqual([
      'importView'
    ]);
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

  describe('the time of the pages', () => {
    it.each(['importView/ImportJobView.js', 'importNew/ImportNewForm.js'])(
      '%s asks for the time zone of the store, so that its times are the ones of the list',
      (file) => {
        expect(readFileSync(`${PAGES}${file}`, 'utf8')).toMatch(
          /setting\s*\{\s*storeTimeZone\s*\}/
        );
      }
    );
  });

  describe('the menu item and the grid', () => {
    const pageSource = (path: string) =>
      readFileSync(`${PAGES}${path}`, 'utf8');

    it('the menu item is in the quick links, after New Product and New Coupon (D-12), and opens the grid', () => {
      const source = pageSource('all/ImportQuickLink.js');
      expect(source).toMatch(/areaId: 'quickLinks'/);
      expect(source).toMatch(/sortOrder: 40/);
      expect(source).toContain('importGrid: url(routeId: "importGrid")');
    });

    it('every sortable header is named by a key that the list accepts', () => {
      const table = readFileSync(
        `${ROOT}components/ImportGridTable.js`,
        'utf8'
      );
      const names = [...table.matchAll(/name:\s*"(\w+)"/g)].map((m) => m[1]);
      expect(names.length).toBeGreaterThanOrEqual(4);
      names.forEach((name) => expect(SORT_KEYS).toContain(name));
    });

    it('the New import button is in the heading of the grid and opens the upload page', () => {
      const source = pageSource('importGrid/NewImportButton.js');
      expect(source).toMatch(/areaId: 'pageHeadingRight'/);
      expect(source).toContain('url(routeId: "importNew")');
    });

    it('the grid asks the list with the filters of the address, and the address of each page and of Delete', () => {
      const source = pageSource('importGrid/Grid.js');
      expect(source).toMatch(/importJobs\(filters: \$filters\)/);
      expect(source).toContain("filters: getContextValue('filtersFromUrl')");
      ['viewUrl', 'deleteApi', 'active', 'createdByName'].forEach((field) =>
        expect(source).toContain(field)
      );
    });
  });

  describe('the page New import', () => {
    const source = readFileSync(`${PAGES}importNew/ImportNewForm.js`, 'utf8');

    it.each(Object.entries(IMPORT_ENTITIES))(
      'asks the template of %s by the value that the template route expects',
      (entity, { routeValue }) => {
        const key = `template${entity[0].toUpperCase()}${entity.slice(1)}Url`;
        expect(source).toContain(
          `${key}: url(routeId: "downloadImportTemplate", params: [{key: "entity", value: "${routeValue}"}])`
        );
      }
    );

    it('asks the address of the page of a job with the id that stands for it', () => {
      expect(source).toContain(
        `viewUrl: url(routeId: "importView", params: [{key: "id", value: "${PLACEHOLDER_ID}"}])`
      );
    });

    it('asks who the admin is and how large a file may be', () => {
      expect(source).toMatch(/currentAdminUser\s*\{\s*adminUserId\s*\}/);
      expect(source).toMatch(/importLimits\s*\{\s*maxFileBytes\s*\}/);
    });
  });
});
