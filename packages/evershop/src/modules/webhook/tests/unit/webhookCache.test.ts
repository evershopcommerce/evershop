import { jest, describe, it, expect } from '@jest/globals';

// The module also builds a DB-backed default cache at import; keep it off the DB.
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: jest.fn()
}));

const { createWebhookCache } = await import('../../services/webhookCache.js');

const target = (id: number, pending = 0) => ({
  webhook: { webhook_id: id } as any,
  pending
});

describe('createWebhookCache', () => {
  it('loads once and serves the cached list within the TTL', async () => {
    const load = jest.fn<() => Promise<any[]>>().mockResolvedValue([target(1)]);
    let now = 1000;
    const cache = createWebhookCache(load, 10000, () => now);

    await cache.getTargets();
    now += 9999;
    await cache.getTargets();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads after the TTL', async () => {
    const load = jest.fn<() => Promise<any[]>>().mockResolvedValue([target(1)]);
    let now = 1000;
    const cache = createWebhookCache(load, 10000, () => now);

    await cache.getTargets();
    now += 10000;
    await cache.getTargets();

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares ONE load between callers that arrive together', async () => {
    let release: (v: any[]) => void = () => {};
    const load = jest.fn<() => Promise<any[]>>(
      () => new Promise((resolve) => (release = resolve))
    );
    const cache = createWebhookCache(load, 10000, () => 0);

    const calls = [cache.getTargets(), cache.getTargets(), cache.getTargets()];
    release([target(1)]);
    const results = await Promise.all(calls);

    expect(load).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r).toHaveLength(1));
  });

  it('bumps the pending count locally, and a refresh replaces it', async () => {
    const load = jest
      .fn<() => Promise<any[]>>()
      .mockResolvedValueOnce([target(1, 5)])
      .mockResolvedValueOnce([target(1, 2)]);
    let now = 0;
    const cache = createWebhookCache(load, 10000, () => now);

    const first = await cache.getTargets();
    cache.recordEnqueued(1, 3);
    expect(first[0].pending).toBe(8);

    now += 10000;
    const second = await cache.getTargets();
    expect(second[0].pending).toBe(2);
  });

  it('ignores recordEnqueued for a webhook it does not hold', async () => {
    const load = jest.fn<() => Promise<any[]>>().mockResolvedValue([target(1)]);
    const cache = createWebhookCache(load, 10000, () => 0);
    await cache.getTargets();
    expect(() => cache.recordEnqueued(99, 1)).not.toThrow();
  });

  it('does not cache a failed load: the next call tries again', async () => {
    const load = jest
      .fn<() => Promise<any[]>>()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce([target(1)]);
    const cache = createWebhookCache(load, 10000, () => 0);

    await expect(cache.getTargets()).rejects.toThrow('db down');
    expect(await cache.getTargets()).toHaveLength(1);
  });
});
