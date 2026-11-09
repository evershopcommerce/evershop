import { describe, it, expect } from '@jest/globals';
import { systemClock } from '../../../adapters/systemClock.js';

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('systemClock', () => {
  it('tells the time of the system', () => {
    const before = Date.now();
    const now = systemClock.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it('sleeps for the time asked, and no less', async () => {
    const start = Date.now();
    await systemClock.sleep(40);
    expect(Date.now() - start).toBeGreaterThanOrEqual(35);
  });

  it('calls the work again and again, until it is stopped', async () => {
    let calls = 0;
    const stop = systemClock.interval(15, () => {
      calls += 1;
    });
    await wait(80);
    stop();
    const seen = calls;
    expect(seen).toBeGreaterThanOrEqual(3);
    await wait(60);
    expect(calls).toBe(seen);
  });

  it('waits for nothing: work that takes longer than the interval is called again', async () => {
    let started = 0;
    const stop = systemClock.interval(10, async () => {
      started += 1;
      await wait(50);
    });
    await wait(60);
    stop();
    // The session, not the clock, skips a tick that finds the last one at work.
    expect(started).toBeGreaterThan(1);
  });

  it('never throws at the timer: a work that fails, or rejects, is forgotten', async () => {
    const seen: unknown[] = [];
    const onError = (e: unknown) => seen.push(e);
    process.on('unhandledRejection', onError);
    process.on('uncaughtException', onError);
    try {
      let calls = 0;
      const stop = systemClock.interval(10, async () => {
        calls += 1;
        if (calls % 2 === 0) throw new Error('rejected');
        throw new Error('also rejected');
      });
      const syncStop = systemClock.interval(10, () => {
        throw new Error('thrown');
      });
      await wait(60);
      stop();
      syncStop();
      await wait(20);
      expect(calls).toBeGreaterThan(1);
      expect(seen).toEqual([]);
    } finally {
      process.off('unhandledRejection', onError);
      process.off('uncaughtException', onError);
    }
  });

  it('can be stopped twice', () => {
    const stop = systemClock.interval(10, () => undefined);
    stop();
    expect(() => stop()).not.toThrow();
  });
});
