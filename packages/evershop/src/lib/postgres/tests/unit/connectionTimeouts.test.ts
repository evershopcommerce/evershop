import { jest, describe, it, expect } from '@jest/globals';

/**
 * Wiring: the two environment variables reach the pool's `onConnect`, so every
 * connection of the process gets the limits. The environment is set BEFORE
 * connection.ts is imported, because it reads it once, when it loads.
 */
process.env.DB_LOCK_TIMEOUT_MS = '5000';
process.env.DB_STATEMENT_TIMEOUT_MS = '30000';

let poolConfig: any;
jest.unstable_mockModule('pg', () => ({
  Pool: class {
    constructor(config: unknown) {
      poolConfig = config;
    }

    on() {
      return this;
    }
  }
}));
jest.unstable_mockModule('../../../util/getConfig.js', () => ({
  getConfig: (_path: string, fallback: unknown) =>
    _path === 'shop.timezone' ? 'Asia/Ho_Chi_Minh' : fallback
}));

await import('../../connection.js');

describe('the pool of a process whose environment sets the timeouts', () => {
  it('applies the time zone and both limits to every new connection', async () => {
    const queries: string[] = [];
    await poolConfig.onConnect({
      query: async (sql: string) => {
        queries.push(sql);
      }
    });
    expect(queries).toEqual([
      'SET TIMEZONE TO "Asia/Ho_Chi_Minh";',
      'SET lock_timeout = 5000',
      'SET statement_timeout = 30000'
    ]);
  });
});
