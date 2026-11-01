import { jest, describe, it, expect } from '@jest/globals';

/**
 * What the cron process does at start-up: every module's bootstrap (core,
 * then extensions) with the cron context, the three locks, then the routes,
 * so jobs can build URLs (`buildUrl` threw "Route ... is not existed" in this
 * process, which never loaded them); then each job is scheduled through
 * `runJob`. No extra settings load is asked for at start (the setting
 * module's own bootstrap warms the cache): `runJob` refreshes them before
 * each job. cronjob.ts runs when it is imported, so everything around
 * it is faked, as in the event process's boot test.
 */
const calls: string[] = [];
const contexts: unknown[] = [];
const scheduled: Array<{ schedule: string; run: () => unknown }> = [];
const ran: unknown[] = [];

const coreModule = { name: 'core', path: '/core' };
const extension = { name: 'ext', path: '/ext' };
const job = {
  name: 'generateSitemap',
  schedule: '0 * * * *',
  resolve: '/jobs/generateSitemap.js',
  enabled: true
};

jest.unstable_mockModule('../../../../bin/extension/index.js', () => ({
  getEnabledExtensions: () => [extension]
}));
jest.unstable_mockModule('../../../../bin/lib/loadModules.js', () => ({
  getCoreModules: () => [coreModule]
}));
jest.unstable_mockModule('../../../../bin/lib/bootstrap/bootstrap.js', () => ({
  loadBootstrapScript: async (module: { path: string }, context: unknown) => {
    calls.push(`bootstrap ${module.path}`);
    contexts.push(context);
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
  refreshSetting: async () => {
    calls.push('refreshSetting');
  }
}));
jest.unstable_mockModule('../../../log/logger.js', () => ({
  debug: () => undefined,
  error: () => undefined
}));
jest.unstable_mockModule('../../jobManager.js', () => ({
  getEnabledJobs: () => {
    // Reading the jobs freezes the job manager: only after the bootstraps
    calls.push('getEnabledJobs');
    return [job];
  }
}));
jest.unstable_mockModule('../../runJob.js', () => ({
  runJob: (j: unknown) => {
    ran.push(j);
  }
}));
jest.unstable_mockModule('node-cron', () => ({
  default: {
    schedule: (schedule: string, run: () => unknown) => {
      calls.push(`schedule ${schedule}`);
      scheduled.push({ schedule, run });
    }
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

await import('../../cronjob.js');
for (let i = 0; i < 50 && scheduled.length === 0; i += 1) {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('cron process start-up', () => {
  it('runs the bootstraps, takes the three locks, loads the routes, then reads and schedules the jobs', () => {
    expect(calls).toEqual([
      'bootstrap /core',
      'bootstrap /ext',
      'lockHooks',
      'lockRegistry',
      'lockAddressRegistry',
      'ensureRoutesLoaded',
      'getEnabledJobs',
      'schedule 0 * * * *'
    ]);
  });

  it('hands every bootstrap the context from the environment, as the cron process', () => {
    const expected = { command: 'start', env: 'production', process: 'cronjob' };
    expect(contexts).toEqual([expected, expected]);
  });

  it('asks for no extra settings load at start (runJob refreshes them before each job)', () => {
    expect(calls).not.toContain('refreshSetting');
  });

  it('a scheduled tick runs the job through runJob', async () => {
    await scheduled[0].run();
    expect(ran).toEqual([job]);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
