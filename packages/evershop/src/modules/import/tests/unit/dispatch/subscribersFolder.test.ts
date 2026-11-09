import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { JOB_REQUESTED } from '../../../adapters/CoreJobRequests.js';

/**
 * Core loads `subscribers/<event>/<file>.js` of every module: the folder name is
 * the event, and every `.js` file in it must export a function by default
 * (`lib/event/loadSubscribers.ts`). A shared file put in there would be loaded
 * as a handler, and a folder with a misspelt name would never be called.
 */
const root = new URL('../../../subscribers/', import.meta.url);

describe('subscribers/ of the import module', () => {
  const events = readdirSync(root, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );

  it('has one folder, named as the event the API writes', () => {
    expect(events.map((entry) => entry.name)).toEqual([JOB_REQUESTED]);
    expect(JOB_REQUESTED).toBe('import_job_requested');
  });

  it('has nothing but handlers in it', () => {
    const entries = readdirSync(root);
    expect(entries).toEqual([JOB_REQUESTED]);
  });

  it('exports a function by default from every file that core would load', async () => {
    for (const event of events) {
      const folder = new URL(`${event.name}/`, root);
      const files = readdirSync(folder).filter((name) => name.endsWith('.js'));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        const mod = await import(fileURLToPath(new URL(file, folder)));
        expect(typeof mod.default).toBe('function');
      }
    }
  });
});
