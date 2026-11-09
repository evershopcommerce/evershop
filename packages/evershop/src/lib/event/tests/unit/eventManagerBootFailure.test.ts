import { jest, describe, it, expect } from '@jest/globals';

/**
 * A bootstrap that throws stops the event process: the error is logged, no lock
 * is taken and the process exits with 0. Like eventManagerBoot.test.ts, it fakes
 * the low-level modules, so it describes the behaviour from before and after the
 * boot moved into headlessBoot (S2).
 */
const logged: unknown[] = [];
const locks: string[] = [];

jest.unstable_mockModule('pg', () => ({
  Client: class {
    async connect() {
      return undefined;
    }

    async query() {
      return undefined;
    }

    on() {
      return this;
    }
  }
}));
jest.unstable_mockModule('../../../../bin/extension/index.js', () => ({
  getEnabledExtensions: () => []
}));
jest.unstable_mockModule('../../../../bin/lib/loadModules.js', () => ({
  getCoreModules: () => [{ name: 'core', path: '/core' }]
}));
jest.unstable_mockModule('../../../../bin/lib/bootstrap/bootstrap.js', () => ({
  loadBootstrapScript: async () => {
    throw new Error('a bootstrap failed');
  }
}));
jest.unstable_mockModule('../../../../bin/lib/ensureRoutesLoaded.js', () => ({
  ensureRoutesLoaded: () => undefined
}));
jest.unstable_mockModule('../../../util/hookable.js', () => ({
  lockHooks: () => {
    locks.push('lockHooks');
  }
}));
jest.unstable_mockModule('../../../util/registry.js', () => ({
  lockRegistry: () => {
    locks.push('lockRegistry');
  }
}));
jest.unstable_mockModule('../../../address/formats.js', () => ({
  lockAddressRegistry: () => {
    locks.push('lockAddressRegistry');
  }
}));
jest.unstable_mockModule('../../../postgres/connection.js', () => ({
  pool: {},
  connectionSetting: {}
}));
jest.unstable_mockModule('../../../../modules/setting/services/setting.js', () => ({
  refreshSetting: async () => undefined
}));
jest.unstable_mockModule('../../../log/logger.js', () => ({
  debug: () => undefined,
  error: (e: unknown) => {
    logged.push(e);
  }
}));
jest.unstable_mockModule('../../loadSubscribers.js', () => ({
  loadSubscribers: async () => []
}));
jest.unstable_mockModule('../../EventStorage.js', () => ({
  EventStorage: class {
    async markStuckAsFailed() {
      return 0;
    }
  }
}));
jest.unstable_mockModule('../../EventProcessor.js', () => ({
  createEventProcessor: () => ({ loadAndProcess: async () => undefined })
}));

const exitCodes: unknown[] = [];
jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
  exitCodes.push(code);
}) as never);
jest.spyOn(process, 'on').mockImplementation((() => process) as never);
jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });

await import('../../event-manager.js');
for (let i = 0; i < 50 && exitCodes.length === 0; i += 1) {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('event-manager when a bootstrap fails', () => {
  it('logs the error and exits with 0', () => {
    expect((logged[0] as Error).message).toBe('a bootstrap failed');
    expect(exitCodes[0]).toBe(0);
  });

  it('takes no lock', () => {
    expect(locks).toEqual([]);
  });
});
