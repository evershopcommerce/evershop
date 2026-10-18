import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';

/**
 * The process itself (§ 8.4, the spawn contract). Only what happens before it
 * boots the store can be run here: a bad argument ends with exit code 1 and
 * touches nothing. The run of a job is tested in `runWorker.test.ts` and, on a
 * database, in `adapters/worker.test.ts`.
 */
const MAIN = fileURLToPath(new URL('../../../worker/main.js', import.meta.url));

const start = (...args: string[]) =>
  spawnSync(process.execPath, [MAIN, ...args], {
    encoding: 'utf8',
    timeout: 60_000,
    // No database: nothing may be reached before the argument is checked.
    env: { PATH: process.env.PATH, SUPPRESS_NO_CONFIG_WARNING: '1' }
  });

describe('worker/main: the argument', () => {
  it.each([
    [[]],
    [['']],
    [['not-a-uuid']],
    [['1']],
    [['11111111-2222-4333-8444-55555555555']],
    [['11111111-2222-4333-8444-5555555555555']]
  ])('ends with exit code 1 for %j, before it boots anything', (args) => {
    const result = start(...args);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'needs the uuid of a job'
    );
  });
});
