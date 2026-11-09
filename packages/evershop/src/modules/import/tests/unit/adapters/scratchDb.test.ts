import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { openScratchDb } from '../helpers/scratchDb.js';

/**
 * The rules of the scratch database helper, which need no database: what it
 * does when none can be reached, and which databases it refuses.
 */
const KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'IMPORT_TEST_DB',
  'IMPORT_DB_REQUIRED',
  'CI'
] as const;
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  jest.restoreAllMocks();
});

/** Nothing listens on port 1. */
function noDatabase() {
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '1';
  process.env.DB_USER = 'nobody';
  delete process.env.IMPORT_DB_REQUIRED;
  delete process.env.IMPORT_TEST_DB;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
}

describe('openScratchDb: when no database can be reached', () => {
  it('gives null, so that the database suites skip', async () => {
    noDatabase();
    expect(await openScratchDb()).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('the database suites are skipped')
    );
  });

  it('gives null also where CI is set: a workflow without a database must not fail', async () => {
    noDatabase();
    process.env.CI = 'true';
    expect(await openScratchDb()).toBeNull();
  });

  it.each(['1', 'true', 'yes'])(
    'throws when IMPORT_DB_REQUIRED is %s',
    async (flag) => {
      noDatabase();
      process.env.IMPORT_DB_REQUIRED = flag;
      await expect(openScratchDb()).rejects.toBeDefined();
    }
  );

  it.each(['', '0', 'false'])(
    'still gives null when IMPORT_DB_REQUIRED is "%s"',
    async (flag) => {
      noDatabase();
      process.env.IMPORT_DB_REQUIRED = flag;
      expect(await openScratchDb()).toBeNull();
    }
  );
});

describe('openScratchDb: the databases it refuses', () => {
  it.each(['daylight_theme', 'evershop', 'postgres', 'evershop_scratch'])(
    'never opens %s, which is not a scratch database for the import tests',
    async (name) => {
      noDatabase();
      process.env.IMPORT_TEST_DB = name;
      // Not "null": a refusal is an error, also where a database is not required.
      await expect(openScratchDb()).rejects.toThrow('_scratch_test');
    }
  );

  it('does not read the name of the database from DB_NAME', async () => {
    noDatabase();
    process.env.DB_NAME = 'daylight_theme';
    try {
      expect(await openScratchDb()).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('"evershop_import_scratch_test"')
      );
    } finally {
      delete process.env.DB_NAME;
    }
  });
});
