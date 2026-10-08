import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { jest } from '@jest/globals';

/**
 * The extension loader picks a source folder per NODE_ENV, and for four years
 * it did so with two parallel `if`s that between them did not cover every
 * NODE_ENV:
 *
 *   if (isProductionMode() || node_modules)      -> dist
 *   if (isDevelopmentMode() && !node_modules)    -> src
 *
 * A LOCAL extension under any other NODE_ENV — a test or e2e runner, or unset —
 * matched neither and was dropped from the returned array with no warning and
 * no error. Every route, page, GraphQL type, migration, subscriber and
 * bootstrap it owned simply did not exist, while core's own routes kept
 * answering, so the app looked alive. It cost the marketplace repo its whole
 * Playwright acceptance tier, which was disabled on 2026-08-19 as "CI runner
 * flakiness" and diagnosed on 2026-09-01 as this.
 *
 * The condition is now `!isDevelopmentMode() || node_modules`, so every mode
 * lands in exactly one branch. These cases exist because nothing in the repo
 * could have caught the gap: the loader had no test at all.
 */

const config: { extensions: unknown[] } = { extensions: [] };

jest.unstable_mockModule('../../../../lib/util/getConfig.js', () => ({
  getConfig: (path: string, fallback: unknown) =>
    path === 'system.extensions' ? config.extensions : fallback
}));

const { getEnabledExtensions } = await import('../../index.js');

let root: string;

/** A local extension on disk, with both folders a built checkout would have. */
function extensionDir(name: string): string {
  const dir = join(root, name);
  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'dist'), { recursive: true });
  return dir;
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'evershop-ext-'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const ENV = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = ENV;
  jest.resetModules();
});

/**
 * `getEnabledExtensions` memoizes, so each case re-imports the module to get a
 * clean cache — the same reason the real loader is read once per process.
 */
async function loadUnder(nodeEnv: string | undefined): Promise<
  Array<{ name: string; path: string; srcPath?: string }>
> {
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  jest.resetModules();
  const mod = await import('../../index.js');
  return mod.getEnabledExtensions() as Array<{
    name: string;
    path: string;
    srcPath?: string;
  }>;
}

describe('getEnabledExtensions — every NODE_ENV lands in exactly one branch', () => {
  beforeEach(() => {
    config.extensions = [
      { name: 'localExt', resolve: extensionDir('localExt'), enabled: true, priority: 10 }
    ];
  });

  it('loads a local extension from dist under NODE_ENV=test', () => {
    // THE REGRESSION. Before the fix this returned [] — silently, which is what
    // made it survive: no warning, no error, just an app missing every
    // extension it was configured with.
    return loadUnder('test').then((extensions) => {
      expect(extensions.map((e) => e.name)).toEqual(['localExt']);
      expect(extensions[0]!.path.endsWith('/dist')).toBe(true);
      // Not a src-mode load: there is no webpack dev server to compile it.
      expect(extensions[0]!.srcPath).toBeUndefined();
    });
  });

  it('loads a local extension from dist when NODE_ENV is unset', async () => {
    const extensions = await loadUnder(undefined);
    expect(extensions.map((e) => e.name)).toEqual(['localExt']);
    expect(extensions[0]!.path.endsWith('/dist')).toBe(true);
  });

  it('still loads from src in development — the dev loop is unchanged', async () => {
    const extensions = await loadUnder('development');
    expect(extensions.map((e) => e.name)).toEqual(['localExt']);
    expect(extensions[0]!.srcPath!.endsWith('/src')).toBe(true);
  });

  it('still loads from dist in production', async () => {
    const extensions = await loadUnder('production');
    expect(extensions.map((e) => e.name)).toEqual(['localExt']);
    expect(extensions[0]!.path.endsWith('/dist')).toBe(true);
    expect(extensions[0]!.srcPath).toBeUndefined();
  });

  it('loads an installed (node_modules) extension from dist in EVERY mode', async () => {
    // The node_modules half of the condition was never broken; it is asserted
    // so the fix cannot be "simplified" into dropping it.
    const dir = extensionDir(join('node_modules', '@vendor', 'installedExt'));
    config.extensions = [
      { name: 'installedExt', resolve: dir, enabled: true, priority: 10 }
    ];
    for (const mode of ['development', 'test', 'production']) {
      const extensions = await loadUnder(mode);
      expect(extensions.map((e) => e.name)).toEqual(['installedExt']);
      expect(extensions[0]!.path.endsWith('/dist')).toBe(true);
    }
  });
});
