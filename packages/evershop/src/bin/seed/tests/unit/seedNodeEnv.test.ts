import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { afterAll, describe, expect, it } from '@jest/globals';

/**
 * `evershop seed` runs in the store's own mode (NODE_ENV from the shell or
 * `.env`). It used to set NODE_ENV to 'development' first, so on a production
 * server the theme and extension loaders asked for a `src/` folder that a
 * built theme or extension does not have to ship, and the seed exited at the
 * first theme file or image.
 *
 * No seed option is given, so the seed stops at its argument check before it
 * touches a database; DB_HOST and DB_PORT point nowhere as a second guard.
 */
const SEED = pathToFileURL(
  fileURLToPath(new URL('../../index.js', import.meta.url))
).href;
const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function modeSeenBySeed(env: Record<string, string>, dotEnv?: string): string {
  const cwd = mkdtempSync(join(tmpdir(), 'evershop-seed-env-'));
  dirs.push(cwd);
  if (dotEnv) {
    writeFileSync(join(cwd, '.env'), dotEnv);
  }
  const run = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { writeSync } from 'fs';
       process.on('exit', () => writeSync(1, 'NODE_ENV=' + process.env.NODE_ENV + '\\n'));
       await import(${JSON.stringify(SEED)});`
    ],
    {
      cwd,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        SUPPRESS_NO_CONFIG_WARNING: '1',
        DB_HOST: '127.0.0.1',
        DB_PORT: '1',
        ...env
      }
    }
  );
  return /NODE_ENV=(\S+)/.exec(run.stdout)?.[1] ?? `no output: ${run.stderr}`;
}

describe('evershop seed keeps the mode it is started in', () => {
  it('NODE_ENV=production stays production', () => {
    expect(modeSeenBySeed({ NODE_ENV: 'production' })).toBe('production');
  });

  it('NODE_ENV=development stays development', () => {
    expect(modeSeenBySeed({ NODE_ENV: 'development' })).toBe('development');
  });

  it('no NODE_ENV stays unset', () => {
    expect(modeSeenBySeed({})).toBe('undefined');
  });

  it('NODE_ENV from the store .env file is read', () => {
    expect(modeSeenBySeed({}, 'NODE_ENV=production\n')).toBe('production');
  });
});
