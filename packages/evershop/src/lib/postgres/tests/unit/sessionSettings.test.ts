import { describe, it, expect } from '@jest/globals';
import {
  applySessionSettings,
  getTimeoutStatements
} from '../../sessionSettings.js';

describe('getTimeoutStatements', () => {
  it('adds nothing when neither variable is set', () => {
    expect(getTimeoutStatements({})).toEqual([]);
  });

  it('ignores variables that are empty or only spaces', () => {
    expect(
      getTimeoutStatements({
        DB_LOCK_TIMEOUT_MS: '',
        DB_STATEMENT_TIMEOUT_MS: '   '
      })
    ).toEqual([]);
  });

  it('sets one limit at a time', () => {
    expect(getTimeoutStatements({ DB_LOCK_TIMEOUT_MS: '5000' })).toEqual([
      'SET lock_timeout = 5000'
    ]);
    expect(getTimeoutStatements({ DB_STATEMENT_TIMEOUT_MS: '30000' })).toEqual([
      'SET statement_timeout = 30000'
    ]);
  });

  it('sets both, always lock timeout first', () => {
    expect(
      getTimeoutStatements({
        DB_STATEMENT_TIMEOUT_MS: '30000',
        DB_LOCK_TIMEOUT_MS: '5000'
      })
    ).toEqual(['SET lock_timeout = 5000', 'SET statement_timeout = 30000']);
  });

  it('accepts 0, which PostgreSQL reads as "no limit"', () => {
    expect(getTimeoutStatements({ DB_LOCK_TIMEOUT_MS: '0' })).toEqual([
      'SET lock_timeout = 0'
    ]);
  });

  it('trims spaces and writes the number without leading zeros', () => {
    expect(getTimeoutStatements({ DB_LOCK_TIMEOUT_MS: ' 007 ' })).toEqual([
      'SET lock_timeout = 7'
    ]);
  });

  it('accepts the largest value PostgreSQL can hold', () => {
    expect(
      getTimeoutStatements({ DB_STATEMENT_TIMEOUT_MS: '2147483647' })
    ).toEqual(['SET statement_timeout = 2147483647']);
  });

  it('ignores every other variable', () => {
    expect(
      getTimeoutStatements({ DB_HOST: 'db', DB_LOCK_TIMEOUT_MS: '1' })
    ).toEqual(['SET lock_timeout = 1']);
  });

  it.each([
    ['2147483648'],
    ['-1'],
    ['1.5'],
    ['5s'],
    ['abc'],
    ['1e3'],
    ['0x10'],
    ['5000; DROP TABLE product']
  ])('refuses %p and names the variable', (value) => {
    expect(() => getTimeoutStatements({ DB_LOCK_TIMEOUT_MS: value })).toThrow(
      /DB_LOCK_TIMEOUT_MS must be a whole number of milliseconds/
    );
    expect(() =>
      getTimeoutStatements({ DB_STATEMENT_TIMEOUT_MS: value })
    ).toThrow(/DB_STATEMENT_TIMEOUT_MS must be a whole number/);
  });

  it('puts the offending value in the message', () => {
    expect(() => getTimeoutStatements({ DB_LOCK_TIMEOUT_MS: '5s' })).toThrow(
      'got "5s"'
    );
  });
});

describe('applySessionSettings', () => {
  const recordingClient = (failOn?: string) => {
    const queries: string[] = [];
    return {
      queries,
      client: {
        query: async (sql: string) => {
          queries.push(sql);
          if (failOn && sql === failOn) {
            throw new Error(`failed: ${sql}`);
          }
          return undefined;
        }
      }
    };
  };

  it('sets the time zone first, then the timeouts, in order', async () => {
    const { client, queries } = recordingClient();
    await applySessionSettings(client, {
      timeZone: 'Asia/Ho_Chi_Minh',
      timeoutStatements: ['SET lock_timeout = 5000', 'SET statement_timeout = 30000']
    });
    expect(queries).toEqual([
      'SET TIMEZONE TO "Asia/Ho_Chi_Minh";',
      'SET lock_timeout = 5000',
      'SET statement_timeout = 30000'
    ]);
  });

  it('only sets the time zone when no timeout is asked for (every process but the import worker)', async () => {
    const { client, queries } = recordingClient();
    await applySessionSettings(client, { timeZone: 'UTC', timeoutStatements: [] });
    expect(queries).toEqual(['SET TIMEZONE TO "UTC";']);
  });

  it('stops at the first statement that fails and passes the error on', async () => {
    const { client, queries } = recordingClient('SET lock_timeout = 5000');
    await expect(
      applySessionSettings(client, {
        timeZone: 'UTC',
        timeoutStatements: ['SET lock_timeout = 5000', 'SET statement_timeout = 30000']
      })
    ).rejects.toThrow('failed: SET lock_timeout = 5000');
    expect(queries).toEqual(['SET TIMEZONE TO "UTC";', 'SET lock_timeout = 5000']);
  });
});
