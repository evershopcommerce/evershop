import { jest, describe, it, expect } from '@jest/globals';

/**
 * A mistyped limit must stop the process when connection.ts loads: a process
 * that silently ran without its limit would queue behind storefront locks.
 */
process.env.DB_LOCK_TIMEOUT_MS = '5s';

jest.unstable_mockModule('pg', () => ({
  Pool: class {
    on() {
      return this;
    }
  }
}));
jest.unstable_mockModule('../../../util/getConfig.js', () => ({
  getConfig: (_path: string, fallback: unknown) => fallback
}));

describe('connection.ts with a mistyped DB_LOCK_TIMEOUT_MS', () => {
  it('refuses to load and says which variable is wrong', async () => {
    await expect(import('../../connection.js')).rejects.toThrow(
      /DB_LOCK_TIMEOUT_MS must be a whole number of milliseconds.*"5s"/
    );
  });
});
