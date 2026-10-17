import { jest, describe, it, expect } from '@jest/globals';

/**
 * What the event process does at start-up, seen from the outside: which
 * bootstraps run, with which context, which locks are taken and in what order,
 * that the settings and the routes are NOT loaded at start (the settings are
 * refreshed before each batch of events instead), and that LISTEN comes after
 * the boot. The fakes are the low-level modules, not headlessBoot, so the same
 * test passes on the code from before the boot was moved into headlessBoot (S2)
 * and on the code after it: that is what shows the move changed nothing.
 * event-manager.ts runs when it is imported, so everything around it is faked.
 */
const calls: string[] = [];
const captured: { processorOptions?: any; contexts: unknown[] } = {
  contexts: []
};

const coreModule = { name: 'core', path: '/core' };
const extension = { name: 'ext', path: '/ext' };
const refreshSetting = async () => {
  calls.push('refreshSetting');
};

jest.unstable_mockModule('pg', () => ({
  Client: class {
    async connect() {
      calls.push('listen client connect');
    }

    async query(sql: string) {
      calls.push(sql);
    }

    on() {
      return this;
    }
  }
}));
jest.unstable_mockModule('../../../../bin/extension/index.js', () => ({
  getEnabledExtensions: () => [extension]
}));
jest.unstable_mockModule('../../../../bin/lib/loadModules.js', () => ({
  getCoreModules: () => [coreModule]
}));
jest.unstable_mockModule('../../../../bin/lib/bootstrap/bootstrap.js', () => ({
  loadBootstrapScript: async (module: { path: string }, context: unknown) => {
    calls.push(`bootstrap ${module.path}`);
    captured.contexts.push(context);
  }
}));
jest.unstable_mockModule('../../../../bin/lib/ensureRoutesLoaded.js', () => ({
  ensureRoutesLoaded: () => {
    calls.push('ensureRoutesLoaded');
  }
}));
jest.unstable_mockModule('../../../util/hookable.js', () => ({
  lockHooks: () => {
    calls.push('lockHooks');
  }
}));
jest.unstable_mockModule('../../../util/registry.js', () => ({
  lockRegistry: () => {
    calls.push('lockRegistry');
  }
}));
jest.unstable_mockModule('../../../address/formats.js', () => ({
  lockAddressRegistry: () => {
    calls.push('lockAddressRegistry');
  }
}));
jest.unstable_mockModule('../../../postgres/connection.js', () => ({
  pool: {},
  connectionSetting: {}
}));
jest.unstable_mockModule('../../../../modules/setting/services/setting.js', () => ({
  refreshSetting
}));
jest.unstable_mockModule('../../../log/logger.js', () => ({
  debug: () => undefined,
  error: () => undefined
}));
jest.unstable_mockModule('../../loadSubscribers.js', () => ({
  loadSubscribers: async () => []
}));
jest.unstable_mockModule('../../EventStorage.js', () => ({
  EventStorage: class {
    async markStuckAsFailed() {
      calls.push('markStuckAsFailed');
      return 0;
    }
  }
}));
jest.unstable_mockModule('../../EventProcessor.js', () => ({
  createEventProcessor: (options: unknown) => {
    captured.processorOptions = options;
    return {
      loadAndProcess: async () => {
        calls.push('loadAndProcess');
      }
    };
  }
}));

process.env.bootstrapContext = JSON.stringify({
  command: 'start',
  env: 'production'
});
const exitSpy = jest
  .spyOn(process, 'exit')
  .mockImplementation((() => undefined) as never);
jest.spyOn(process, 'on').mockImplementation((() => process) as never);
jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });

await import('../../event-manager.js');
for (let i = 0; i < 50 && !calls.includes('loadAndProcess'); i += 1) {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('event-manager start-up', () => {
  it('runs the bootstrap of the core modules, then the extensions, then takes the three locks, then listens and drains', () => {
    expect(calls).toEqual([
      'bootstrap /core',
      'bootstrap /ext',
      'lockHooks',
      'lockRegistry',
      'lockAddressRegistry',
      'listen client connect',
      'LISTEN new_event',
      'markStuckAsFailed',
      'loadAndProcess'
    ]);
  });

  it('hands every bootstrap the context from the environment, as the event process', () => {
    const expected = { command: 'start', env: 'production', process: 'event' };
    expect(captured.contexts).toEqual([expected, expected]);
  });

  it('does not load the settings or the routes at start; it refreshes the settings before each batch instead', () => {
    expect(calls).not.toContain('refreshSetting');
    expect(calls).not.toContain('ensureRoutesLoaded');
    expect(captured.processorOptions.beforeBatch).toBe(refreshSetting);
  });

  it('forbids changes to the configuration once booted, and does not exit', () => {
    expect(process.env.ALLOW_CONFIG_MUTATIONS).toBe('false');
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
