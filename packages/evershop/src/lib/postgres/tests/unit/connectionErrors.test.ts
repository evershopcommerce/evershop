import { EventEmitter } from 'events';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * A connection the database closes is an 'error' event: on the pool for an
 * idle connection, on the client for one in use. With no listener the event is
 * thrown, and the logger's exception handler (winston, `exitOnError`) ends the
 * process: every store stopped on a database restart (2026-11-19). The pool is
 * a bare EventEmitter here, so the test sees exactly what connection.ts
 * listens to.
 */
const logged: { warning: string[]; debug: string[] } = {
  warning: [],
  debug: []
};

jest.unstable_mockModule('pg', () => ({
  Pool: class extends EventEmitter {}
}));
jest.unstable_mockModule('../../../log/logger.js', () => ({
  warning: (message: string) => {
    logged.warning.push(message);
  },
  debug: (message: string) => {
    logged.debug.push(message);
  }
}));
jest.unstable_mockModule('../../../util/getConfig.js', () => ({
  getConfig: (_path: string, fallback: unknown) => fallback
}));

const { pool } = await import('../../connection.js');

beforeEach(() => {
  logged.warning = [];
  logged.debug = [];
});

describe('a connection that the database closes', () => {
  it('an idle one: the pool error is not thrown, and is logged as a warning', () => {
    expect(() =>
      pool.emit(
        'error',
        new Error('terminating connection due to administrator command')
      )
    ).not.toThrow();
    expect(logged.warning).toEqual([
      expect.stringContaining(
        'terminating connection due to administrator command'
      )
    ]);
  });

  it('one in use: the client error is not thrown, and is logged for debugging only', () => {
    const client = new EventEmitter();
    pool.emit('connect', client);
    expect(() =>
      client.emit('error', new Error('Connection terminated unexpectedly'))
    ).not.toThrow();
    expect(logged.debug).toEqual([
      expect.stringContaining('Connection terminated unexpectedly')
    ]);
    expect(logged.warning).toEqual([]);
  });
});
