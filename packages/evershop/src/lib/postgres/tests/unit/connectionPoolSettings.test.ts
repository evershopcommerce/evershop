import { jest, describe, it, expect } from '@jest/globals';

/**
 * Wiring: DB_POOL_MAX and DB_POOL_TIMEOUT_MS reach the pool, and the wait also
 * reaches `connectionSetting`, from which the event process builds its LISTEN
 * client. The environment is set BEFORE connection.ts is imported, because it
 * reads it once, when it loads.
 */
process.env.DB_POOL_MAX = '5';
process.env.DB_POOL_TIMEOUT_MS = '10000';

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
  getConfig: (_path: string, fallback: unknown) => fallback
}));

const { connectionSetting } = await import('../../connection.js');

describe('the pool of a process whose environment sets its size and wait', () => {
  it('opens at most DB_POOL_MAX connections and waits at most DB_POOL_TIMEOUT_MS for one', () => {
    expect(poolConfig.max).toBe(5);
    expect(poolConfig.connectionTimeoutMillis).toBe(10000);
  });

  it('gives the same wait to the clients built from connectionSetting', () => {
    expect(connectionSetting.connectionTimeoutMillis).toBe(10000);
  });
});
