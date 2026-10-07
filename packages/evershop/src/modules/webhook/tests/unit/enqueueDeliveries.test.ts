import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: jest.fn()
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn()
}));

const { enqueueDeliveries } = await import('../../services/enqueueDeliveries.js');

const NOW = new Date('2026-10-07T10:00:00.000Z');

const hook = (id: number, topics: string[], name = `hook ${id}`) => ({
  webhook_id: id,
  uuid: `w-${id}`,
  name,
  url: 'https://example.com',
  secret: 's',
  topics,
  enabled: true,
  created_at: '',
  updated_at: ''
});

describe('enqueueDeliveries', () => {
  let deps: any;
  let ids: number;
  let delivered: any[];

  beforeEach(() => {
    ids = 0;
    delivered = [];
    deps = {
      getTargets: jest.fn(),
      recordEnqueued: jest.fn(),
      sanitize: jest.fn(async (d: unknown) => d),
      insert: jest.fn(async (rows: any[]) =>
        rows.map((r, i) => ({ ...r, webhook_delivery_id: 100 + i }))
      ),
      claim: jest.fn(async (idList: number[]) =>
        idList.map((id) => ({ webhook_delivery_id: id }))
      ),
      deliver: jest.fn(async (d: any) => {
        delivered.push(d);
      }),
      warn: jest.fn(),
      logError: jest.fn(),
      now: () => NOW,
      newId: () => `id-${(ids += 1)}`
    };
  });

  it('does nothing, and touches no table, when no webhook wants the topic', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['product_created']), pending: 0 }
    ]);

    const result = await enqueueDeliveries('order_placed', {}, 'ev-1', deps);

    expect(result).toEqual({ enqueued: 0, skipped: 0 });
    expect(deps.sanitize).not.toHaveBeenCalled();
    expect(deps.insert).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it('writes the delivery row BEFORE it tries to send', async () => {
    const order: string[] = [];
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['order_placed']), pending: 0 }
    ]);
    deps.insert.mockImplementation(async (rows: any[]) => {
      order.push('insert');
      return rows.map((r, i) => ({ ...r, webhook_delivery_id: 100 + i }));
    });
    deps.deliver.mockImplementation(async () => {
      order.push('deliver');
    });

    await enqueueDeliveries('order_placed', { id: 1 }, 'ev-1', deps);

    expect(order).toEqual(['insert', 'deliver']);
  });

  it('builds one envelope per matching webhook, with its own delivery id', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['order_placed']), pending: 0 },
      { webhook: hook(2, ['order_placed']), pending: 0 },
      { webhook: hook(3, ['product_created']), pending: 0 }
    ]);

    const result = await enqueueDeliveries('order_placed', { id: 9 }, 'ev-1', deps);

    expect(result.enqueued).toBe(2);
    const rows = deps.insert.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows.map((r: any) => r.webhookId)).toEqual([1, 2]);
    expect(rows[0].uuid).not.toBe(rows[1].uuid);
    expect(rows[0].payload).toEqual({
      id: rows[0].uuid,
      event_id: 'ev-1',
      topic: 'order_placed',
      created_at: NOW.toISOString(),
      data: { id: 9 }
    });
    // Both deliveries share the event id.
    expect(rows[1].payload.event_id).toBe('ev-1');
  });

  it('sends the SANITIZED data, not the raw event data', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['customer_created']), pending: 0 }
    ]);
    deps.sanitize.mockResolvedValue({ email: 'a@b.com' });

    await enqueueDeliveries(
      'customer_created',
      { email: 'a@b.com', password: 'hash' },
      'ev-1',
      deps
    );

    expect(deps.insert.mock.calls[0][0][0].payload.data).toEqual({
      email: 'a@b.com'
    });
  });

  it('claims exactly the rows it inserted and sends each one', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['order_placed']), pending: 0 },
      { webhook: hook(2, ['order_placed']), pending: 0 }
    ]);

    await enqueueDeliveries('order_placed', {}, 'ev-1', deps);

    expect(deps.claim).toHaveBeenCalledWith([100, 101]);
    expect(delivered.map((d) => d.webhook_delivery_id)).toEqual([100, 101]);
  });

  it('bumps the cached pending count for each webhook it enqueued for', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['order_placed']), pending: 0 },
      { webhook: hook(2, ['order_placed']), pending: 0 }
    ]);

    await enqueueDeliveries('order_placed', {}, 'ev-1', deps);

    expect(deps.recordEnqueued).toHaveBeenCalledWith(1, 1);
    expect(deps.recordEnqueued).toHaveBeenCalledWith(2, 1);
  });

  it('skips a webhook at the pending ceiling but still serves the others', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['order_placed'], 'full'), pending: 10000 },
      { webhook: hook(2, ['order_placed']), pending: 0 }
    ]);

    const result = await enqueueDeliveries('order_placed', {}, 'ev-1', deps);

    expect(result).toEqual({ enqueued: 1, skipped: 1 });
    expect(deps.insert.mock.calls[0][0].map((r: any) => r.webhookId)).toEqual([2]);
    expect(deps.warn).toHaveBeenCalledTimes(1);
    expect(deps.warn.mock.calls[0][0]).toContain('"full"');
  });

  it('logs the backlog warning at most once a minute per webhook', async () => {
    let current = NOW.getTime();
    deps.now = () => new Date(current);
    deps.getTargets.mockResolvedValue([
      { webhook: hook(42, ['order_placed']), pending: 10000 }
    ]);

    await enqueueDeliveries('order_placed', {}, 'ev-1', deps);
    await enqueueDeliveries('order_placed', {}, 'ev-2', deps);
    expect(deps.warn).toHaveBeenCalledTimes(1);

    current += 61000;
    await enqueueDeliveries('order_placed', {}, 'ev-3', deps);
    expect(deps.warn).toHaveBeenCalledTimes(2);
  });

  it('does not record skipped deliveries anywhere', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(7, ['order_placed']), pending: 10000 }
    ]);

    await enqueueDeliveries('order_placed', {}, 'ev-1', deps);

    expect(deps.insert).not.toHaveBeenCalled();
  });

  it('keeps going and logs when one delivery attempt throws', async () => {
    deps.getTargets.mockResolvedValue([
      { webhook: hook(1, ['order_placed']), pending: 0 },
      { webhook: hook(2, ['order_placed']), pending: 0 }
    ]);
    deps.deliver
      .mockRejectedValueOnce(new Error('db blip'))
      .mockImplementationOnce(async (d: any) => {
        delivered.push(d);
      });

    await enqueueDeliveries('order_placed', {}, 'ev-1', deps);

    expect(delivered).toHaveLength(1);
    expect(deps.logError).toHaveBeenCalledTimes(1);
  });
});
