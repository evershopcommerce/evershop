import { existsSync } from 'fs';
import { basename, dirname } from 'path';
import { jest, describe, it, expect } from '@jest/globals';

const warning = jest.fn();
jest.unstable_mockModule('../../../../../lib/log/logger.js', () => ({
  error: jest.fn(),
  warning,
  debug: jest.fn()
}));

const { default: bootstrap, IMPORT_CRON_JOBS } = await import(
  '../../../bootstrap.js'
);
const { getAllJobs, getJob } = await import(
  '../../../../../lib/cronjob/jobManager.js'
);

/**
 * What the module's `bootstrap.ts` gives core (§ 8.4): the three cron jobs.
 * Core runs a bootstrap in the cron process, and ends that process when one
 * throws, so a bad registration must never throw.
 */
describe('the bootstrap of the import module', () => {
  it('registers the three cron jobs, each with its schedule', () => {
    bootstrap();
    expect(
      getAllJobs()
        .map(({ name, schedule, enabled }) => ({ name, schedule, enabled }))
        .sort((a, b) => a.name.localeCompare(b.name))
    ).toEqual([
      { name: 'importCleanup', schedule: '*/10 * * * *', enabled: true },
      { name: 'importDispatch', schedule: '* * * * *', enabled: true },
      { name: 'importRecover', schedule: '* * * * *', enabled: true }
    ]);
    expect(warning).not.toHaveBeenCalled();
  });

  it.each(IMPORT_CRON_JOBS.map((job) => [job.name]))(
    '%s runs the file of the same name in jobs/ of this module',
    (name) => {
      const job = getJob(name)!;
      expect(existsSync(job.resolve)).toBe(true);
      expect(basename(job.resolve)).toBe(`${name}.js`);
      expect(basename(dirname(job.resolve))).toBe('jobs');
      expect(basename(dirname(dirname(job.resolve)))).toBe('import');
    }
  );

  it('does not throw when the jobs cannot be registered, and says which', () => {
    // Reading the jobs closes the job manager, as core does once every bootstrap
    // has run: from here on registerJob throws.
    expect(() => bootstrap()).not.toThrow();
    const said = warning.mock.calls.map(([message]) => String(message));
    for (const { name } of IMPORT_CRON_JOBS) {
      expect(said.some((m) => m.includes(name))).toBe(true);
    }
  });
});
