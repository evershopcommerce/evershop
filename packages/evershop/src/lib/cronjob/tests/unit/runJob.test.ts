import { describe, it, expect } from '@jest/globals';
import { runJob, type RunJobDeps } from '../../runJob.js';

/**
 * The cron process filled its settings cache once, at boot, and never again
 * (only the webhook job refreshed it, for itself): a setting an admin saved
 * (PayPal credentials, the store languages) did not reach the jobs until a
 * restart. Every run now refreshes the settings first; a failed refresh keeps
 * the old cache and the job still runs.
 */
function fakeDeps(over: Partial<RunJobDeps> = {}) {
  const calls: string[] = [];
  const errors: unknown[] = [];
  const deps: RunJobDeps = {
    refreshSettings: async () => {
      calls.push('refresh');
    },
    importJob: async () => ({
      default: async () => {
        calls.push('job');
      }
    }),
    logError: (e) => {
      errors.push(e);
    },
    ...over
  };
  return { deps, calls, errors };
}

const JOB = { name: 'generateSitemap', resolve: '/jobs/generateSitemap.js' };

describe('runJob', () => {
  it('refreshes the settings before the job runs', async () => {
    const { deps, calls, errors } = fakeDeps();
    await runJob(JOB, deps);
    expect(calls).toEqual(['refresh', 'job']);
    expect(errors).toEqual([]);
  });

  it('runs every time, so each run sees the latest settings', async () => {
    const { deps, calls } = fakeDeps();
    await runJob(JOB, deps);
    await runJob(JOB, deps);
    expect(calls).toEqual(['refresh', 'job', 'refresh', 'job']);
  });

  it('a failed refresh is logged and the job still runs on the cache it had', async () => {
    const { deps, calls, errors } = fakeDeps({
      refreshSettings: async () => {
        throw new Error('connection refused');
      }
    });
    await runJob(JOB, deps);
    expect(calls).toEqual(['job']);
    expect(errors.map(String)).toEqual(['Error: connection refused']);
  });

  it('a job that throws, or does not export a function, is logged as before', async () => {
    const failing = fakeDeps({
      importJob: async () => ({
        default: async () => {
          throw new Error('job failed');
        }
      })
    });
    await expect(runJob(JOB, failing.deps)).resolves.toBeUndefined();
    expect(failing.errors.map(String)).toEqual(['Error: job failed']);

    const notAFunction = fakeDeps({ importJob: async () => ({}) });
    await runJob(JOB, notAFunction.deps);
    expect(String(notAFunction.errors[0])).toContain(
      'Job generateSitemap is not a function'
    );
  });
});
