import { jest, describe, it, expect } from '@jest/globals';

/**
 * A mistyped pool size must stop the process when connection.ts loads, as a
 * mistyped timeout does: a process that silently kept 20 connections would
 * break the connection budget it was given.
 */
process.env.DB_POOL_MAX = '5 connections';

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

describe('connection.ts with a mistyped DB_POOL_MAX', () => {
  it('refuses to load and says which variable is wrong', async () => {
    await expect(import('../../connection.js')).rejects.toThrow(
      /DB_POOL_MAX must be a whole number from 1 to 2147483647, got "5 connections"/
    );
  });
});
