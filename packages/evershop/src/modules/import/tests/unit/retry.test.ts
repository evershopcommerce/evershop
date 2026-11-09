import { describe, it, expect } from '@jest/globals';
import { ImageError } from '../../services/images/types.js';
import {
  isTransientDatabaseError,
  isTransientImageError,
  RETRY_WAITS_MS,
  withRetries
} from '../../services/retry.js';

const dbError = (code: string) => Object.assign(new Error('x'), { code });

describe('isTransientDatabaseError (D-20)', () => {
  it.each([
    ['40001'],
    ['40P01'],
    ['55P03'],
    ['57014'],
    ['53300'],
    ['08000'],
    ['08003'],
    ['08006'],
    ['08001'],
    ['57P01'],
    ['57P02'],
    ['57P03'],
    ['ECONNREFUSED'],
    ['ECONNRESET'],
    ['EPIPE'],
    ['ETIMEDOUT']
  ])('%s can go away by itself', (code) => {
    expect(isTransientDatabaseError(dbError(code))).toBe(true);
  });

  it.each([
    ['23505'],
    ['23502'],
    ['23503'],
    ['22001'],
    ['22P02'],
    ['42P01'],
    ['42703'],
    ['EACCES'],
    ['']
  ])('%s fails at once', (code) => {
    expect(isTransientDatabaseError(dbError(code))).toBe(false);
  });

  it('knows the errors of the driver for a connection that dropped under a query, which have no code', () => {
    expect(
      isTransientDatabaseError(new Error('Connection terminated unexpectedly'))
    ).toBe(true);
    expect(
      isTransientDatabaseError(
        new Error(
          'Client has encountered a connection error and is not queryable'
        )
      )
    ).toBe(true);
    // Exactly these: our own end() of a client and a wrapped message are not it.
    expect(isTransientDatabaseError(new Error('Connection terminated'))).toBe(
      false
    );
    expect(
      isTransientDatabaseError(
        new Error('failed: Connection terminated unexpectedly')
      )
    ).toBe(false);
    expect(
      isTransientDatabaseError({
        message: 'Connection terminated unexpectedly'
      })
    ).toBe(false);
  });

  it('is not fooled by an error with no code, or no error', () => {
    expect(isTransientDatabaseError(new Error('boom'))).toBe(false);
    expect(isTransientDatabaseError(null)).toBe(false);
    expect(isTransientDatabaseError('08006')).toBe(false);
    expect(isTransientDatabaseError({ code: 8006 })).toBe(false);
  });
});

describe('isTransientImageError (D-20)', () => {
  it.each([
    [new ImageError('timeout')],
    [new ImageError('network', { code: 'ECONNREFUSED' })],
    [new ImageError('network', { code: 'ECONNRESET' })],
    [new ImageError('network', { code: 'ENOTFOUND' })],
    [new ImageError('network', { code: 'EAI_AGAIN' })],
    ...[408, 425, 429, 500, 502, 503, 504].map((status) => [
      new ImageError('http_status', { status })
    ])
  ])('%j can go away by itself', (error) => {
    expect(isTransientImageError(error)).toBe(true);
  });

  it.each([
    [new ImageError('http_status', { status: 404 })],
    [new ImageError('http_status', { status: 403 })],
    [new ImageError('http_status', { status: 501 })],
    [new ImageError('network', { code: 'ERROR' })],
    [new ImageError('not_an_image', { contentType: 'text/html' })],
    [new ImageError('too_large')],
    [new ImageError('blocked')],
    [new ImageError('invalid_url')],
    [new ImageError('type_not_allowed')],
    [new ImageError('empty')],
    [new ImageError('too_many_redirects')],
    [new ImageError('storage_failed')],
    [new Error('boom')],
    [null]
  ])('%j fails at once', (error) => {
    expect(isTransientImageError(error)).toBe(false);
  });
});

describe('withRetries (D-20)', () => {
  const transient = () => true;

  it('waits 1 s, 3 s and 9 s, and tries four times in all', async () => {
    const sleeps: number[] = [];
    let attempts = 0;
    await expect(
      withRetries(
        async () => {
          attempts += 1;
          throw new Error(`attempt ${attempts}`);
        },
        { isTransient: transient, sleep: async (ms) => void sleeps.push(ms) }
      )
    ).rejects.toThrow('attempt 4');
    expect(RETRY_WAITS_MS).toEqual([1000, 3000, 9000]);
    expect(sleeps).toEqual([1000, 3000, 9000]);
    expect(attempts).toBe(4);
  });

  it('is a success when a retry succeeds, and says how many it took', async () => {
    const sleeps: number[] = [];
    const retries: number[] = [];
    let attempts = 0;
    const value = await withRetries(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('later');
        return 'done';
      },
      {
        isTransient: transient,
        sleep: async (ms) => void sleeps.push(ms),
        onRetry: (_error, retry) => void retries.push(retry)
      }
    );
    expect(value).toBe('done');
    expect(sleeps).toEqual([1000, 3000]);
    expect(retries).toEqual([1, 2]);
  });

  it('does not wait for a failure that is not transient', async () => {
    const sleeps: number[] = [];
    let attempts = 0;
    await expect(
      withRetries(
        async () => {
          attempts += 1;
          throw new Error('permanent');
        },
        { isTransient: () => false, sleep: async (ms) => void sleeps.push(ms) }
      )
    ).rejects.toThrow('permanent');
    expect([attempts, sleeps]).toEqual([1, []]);
  });

  it('gives the work back at once when it works', async () => {
    const sleeps: number[] = [];
    expect(
      await withRetries(async () => 7, {
        isTransient: transient,
        sleep: async (ms) => void sleeps.push(ms)
      })
    ).toBe(7);
    expect(sleeps).toEqual([]);
  });

  it('stops waiting when it is aborted, and throws the failure', async () => {
    const controller = new AbortController();
    const sleeps: number[] = [];
    let attempts = 0;
    await expect(
      withRetries(
        async () => {
          attempts += 1;
          if (attempts === 2) controller.abort();
          throw new Error(`attempt ${attempts}`);
        },
        {
          isTransient: transient,
          sleep: async (ms) => void sleeps.push(ms),
          signal: controller.signal
        }
      )
    ).rejects.toThrow('attempt 2');
    expect(sleeps).toEqual([1000]);
  });
});
