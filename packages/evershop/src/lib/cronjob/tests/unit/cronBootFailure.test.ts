import { jest, describe, it, expect } from '@jest/globals';

/**
 * A bootstrap that throws stops the cron process: the error is logged, the
 * process exits with 0, and nothing after the boot happens (no lock, no
 * routes, no job read or scheduled). The same as the event process
 * (eventManagerBootFailure.test.ts); the low-level modules are faked, as in
 * cronBoot.test.ts.
 */
const logged: unknown[] = [];
const calls: string[] = [];

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
jest.unstable_mockModule('../../../../modules/setting/services/setting.js', () => ({
  refreshSetting: async () => undefined
}));
jest.unstable_mockModule('../../../log/logger.js', () => ({
  debug: () => undefined,
  error: (e: unknown) => {
    logged.push(e);
  }
}));
jest.unstable_mockModule('../../jobManager.js', () => ({
  getEnabledJobs: () => {
    calls.push('getEnabledJobs');
    return [];
  }
}));
jest.unstable_mockModule('../../runJob.js', () => ({
  runJob: () => undefined
}));
jest.unstable_mockModule('node-cron', () => ({
  default: {
    schedule: () => {
      calls.push('schedule');
    }
  }
}));

// process.exit is faked, so it returns: whatever follows it must not run
const exitCodes: unknown[] = [];
jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
  exitCodes.push(code);
}) as never);
jest.spyOn(process, 'on').mockImplementation((() => process) as never);

await import('../../cronjob.js');
for (let i = 0; i < 50 && exitCodes.length === 0; i += 1) {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('cron process when a bootstrap fails', () => {
  it('logs the error and exits with 0', () => {
    expect((logged[0] as Error).message).toBe('a bootstrap failed');
    expect(exitCodes).toEqual([0]);
  });

  it('takes no lock, loads no routes, and reads or schedules no job', () => {
    expect(calls).toEqual([]);
  });
});
