import { describe, it, expect } from '@jest/globals';
import { runHeadlessBoot } from '../../runHeadlessBoot.js';
import type {
  BootModule,
  HeadlessBootDeps
} from '../../runHeadlessBoot.js';

/**
 * The boot of a process that has no Express app. The default call must do what
 * the event process has always done: every bootstrap in order, then the three
 * locks, and nothing else.
 */
const coreModule: BootModule = { path: '/core/catalog' };
const extension: BootModule = { path: '/ext/shipping' };

function makeDeps(overrides: Partial<HeadlessBootDeps> = {}) {
  const calls: string[] = [];
  const deps: HeadlessBootDeps = {
    modules: () => {
      calls.push('modules()');
      return [coreModule, extension];
    },
    loadBootstrapScript: async (module, context) => {
      calls.push(`bootstrap ${module.path} (${context.process})`);
    },
    lockHooks: () => {
      calls.push('lockHooks');
    },
    lockRegistry: () => {
      calls.push('lockRegistry');
    },
    lockAddressRegistry: () => {
      calls.push('lockAddressRegistry');
    },
    refreshSetting: async () => {
      calls.push('refreshSetting');
    },
    ensureRoutesLoaded: () => {
      calls.push('ensureRoutesLoaded');
    },
    ...overrides
  };
  return { deps, calls };
}

describe('runHeadlessBoot', () => {
  it('runs every bootstrap in order, then the three locks, and nothing else (the event process)', async () => {
    const { deps, calls } = makeDeps();
    await runHeadlessBoot({ context: { process: 'event' } }, deps);
    expect(calls).toEqual([
      'modules()',
      'bootstrap /core/catalog (event)',
      'bootstrap /ext/shipping (event)',
      'lockHooks',
      'lockRegistry',
      'lockAddressRegistry'
    ]);
  });

  it('boots the modules it is given and does not look for others', async () => {
    const { deps, calls } = makeDeps();
    await runHeadlessBoot(
      { context: { process: 'event' }, modules: [extension] },
      deps
    );
    expect(calls).toEqual([
      'bootstrap /ext/shipping (event)',
      'lockHooks',
      'lockRegistry',
      'lockAddressRegistry'
    ]);
  });

  it('hands the same context to every bootstrap', async () => {
    const seen: unknown[] = [];
    const { deps } = makeDeps({
      loadBootstrapScript: async (_module, context) => {
        seen.push(context);
      }
    });
    const context = { command: 'start', env: 'production' as const, process: 'import' as const };
    await runHeadlessBoot({ context }, deps);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(context);
    expect(seen[1]).toBe(context);
  });

  it('loads the settings once, after the locks, when asked (the import worker)', async () => {
    const { deps, calls } = makeDeps();
    await runHeadlessBoot(
      { context: { process: 'import' }, refreshSettings: true },
      deps
    );
    expect(calls.slice(-4)).toEqual([
      'lockHooks',
      'lockRegistry',
      'lockAddressRegistry',
      'refreshSetting'
    ]);
    expect(calls).not.toContain('ensureRoutesLoaded');
  });

  it('fills the route registry once, after the locks, when asked', async () => {
    const { deps, calls } = makeDeps();
    await runHeadlessBoot(
      { context: { process: 'import' }, loadRoutes: true },
      deps
    );
    expect(calls.slice(-2)).toEqual(['lockAddressRegistry', 'ensureRoutesLoaded']);
    expect(calls).not.toContain('refreshSetting');
  });

  it('does both in a fixed order: settings, then routes', async () => {
    const { deps, calls } = makeDeps();
    await runHeadlessBoot(
      { context: { process: 'import' }, refreshSettings: true, loadRoutes: true },
      deps
    );
    expect(calls.slice(-2)).toEqual(['refreshSetting', 'ensureRoutesLoaded']);
  });

  it('starts a bootstrap only when the one before it has finished', async () => {
    const events: string[] = [];
    let finishFirst: () => void = () => undefined;
    const { deps } = makeDeps({
      loadBootstrapScript: async (module) => {
        events.push(`start ${module.path}`);
        if (module === coreModule) {
          await new Promise<void>((resolve) => {
            finishFirst = resolve;
          });
        }
        events.push(`end ${module.path}`);
      }
    });
    const booting = runHeadlessBoot({ context: { process: 'event' } }, deps);
    await new Promise((resolve) => setImmediate(resolve));
    expect(events).toEqual(['start /core/catalog']);
    finishFirst();
    await booting;
    expect(events).toEqual([
      'start /core/catalog',
      'end /core/catalog',
      'start /ext/shipping',
      'end /ext/shipping'
    ]);
  });

  it('locks nothing, boots no further module and passes the error on when a bootstrap throws', async () => {
    const { deps, calls } = makeDeps({
      loadBootstrapScript: async (module) => {
        calls.push(`bootstrap ${module.path}`);
        if (module === coreModule) {
          throw new Error('bootstrap failed');
        }
      }
    });
    await expect(
      runHeadlessBoot(
        { context: { process: 'import' }, refreshSettings: true, loadRoutes: true },
        deps
      )
    ).rejects.toThrow('bootstrap failed');
    expect(calls).toEqual(['modules()', 'bootstrap /core/catalog']);
  });

  it('passes the error on when the settings cannot be loaded, and does not fill the routes', async () => {
    const { deps, calls } = makeDeps({
      refreshSetting: async () => {
        throw new Error('database is down');
      }
    });
    await expect(
      runHeadlessBoot(
        { context: { process: 'import' }, refreshSettings: true, loadRoutes: true },
        deps
      )
    ).rejects.toThrow('database is down');
    expect(calls).toContain('lockAddressRegistry');
    expect(calls).not.toContain('ensureRoutesLoaded');
  });
});
