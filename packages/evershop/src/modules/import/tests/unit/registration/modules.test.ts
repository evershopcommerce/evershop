import { existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from '@jest/globals';
import { ensureRoutesLoaded } from '../../../../../bin/lib/ensureRoutesLoaded.js';
import { getCoreModules } from '../../../../../bin/lib/loadModules.js';
import { getRoutes } from '../../../../../lib/router/Router.js';

/**
 * The module is switched on by being in core's list of modules (§ 4.4): core
 * scans its routes, runs its bootstrap and its migration, and loads its
 * subscribers from there and from nowhere else.
 */
describe('the import module in the list of core modules', () => {
  const modules: Array<{ name: string; path: string }> = getCoreModules();
  // A missing entry fails the first test, on its own line, not with a TypeError.
  const entry = modules.find((m) => m.name === 'import') as {
    name: string;
    path: string;
  };

  it('is there, once, on the folder of this module', () => {
    expect(modules.filter((m) => m.name === 'import')).toHaveLength(1);
    expect(existsSync(join(entry.path, 'bootstrap.js'))).toBe(true);
    expect(existsSync(join(entry.path, 'migration', 'Version-1.0.0.js'))).toBe(
      true
    );
    expect(
      existsSync(
        join(
          entry.path,
          'subscribers',
          'import_job_requested',
          'startImportWorker.js'
        )
      )
    ).toBe(true);
  });

  it('comes after auth, whose table admin_user its migration refers to', () => {
    const names = modules.map((m) => m.name);
    expect(names.indexOf('import')).toBeGreaterThan(names.indexOf('auth'));
  });
});

describe('the routes of the import module, as core loads them', () => {
  const IDS = [
    'cancelImportJob',
    'createImportJob',
    'deleteImportJob',
    'downloadFileWithErrors',
    'downloadImportTemplate',
    'getImportIssues',
    'getImportJob',
    'listOpenImportJobs',
    'recheckImportJob',
    'resumeImportJob',
    'startImportJob'
  ];

  it('are the eleven of § 8.3, each once, all private API routes', () => {
    ensureRoutesLoaded();
    const mine = getRoutes().filter((route: { path: string }) =>
      route.path.startsWith('/api/import-')
    );
    expect(mine.map((r: { id: string }) => r.id).sort()).toEqual(IDS);
    for (const route of mine) {
      expect(route).toMatchObject({
        isApi: true,
        isAdmin: false,
        access: 'private'
      });
    }
    // A route id is the permission set: none of them may be another module's.
    const ids = getRoutes().map((r: { id: string }) => r.id);
    for (const id of IDS) {
      expect(ids.filter((other: string) => other === id)).toHaveLength(1);
    }
  });
});
