import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';

/**
 * Core runs a cron job by importing the file it was registered with and calling
 * its default export (`lib/cronjob/cronjob.ts`). Registering a job that is not
 * there, or whose file does not export a function, fails at start-up (the
 * registration step does it), so the files are checked here, now.
 */
const root = new URL('../../../jobs/', import.meta.url);

describe('jobs/ of the import module', () => {
  const files = readdirSync(root).filter((name) => name.endsWith('.js'));

  it('has the three cron jobs of § 8.4, and nothing else', () => {
    expect(files.sort()).toEqual([
      'importCleanup.js',
      'importDispatch.js',
      'importRecover.js'
    ]);
  });

  it.each(['importCleanup', 'importDispatch', 'importRecover'])(
    '%s exports an async function by default, with the name of the job',
    async (name) => {
      const file = fileURLToPath(new URL(`${name}.js`, root));
      expect(existsSync(file)).toBe(true);
      const mod = await import(file);
      expect(typeof mod.default).toBe('function');
      expect(mod.default.name).toBe(name);
      expect(mod.default.constructor.name).toBe('AsyncFunction');
    }
  );
});
