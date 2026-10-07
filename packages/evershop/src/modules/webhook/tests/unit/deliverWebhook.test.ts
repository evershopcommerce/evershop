import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// deliveryStore (imported for the default deps) pulls in the DB pool.
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));

const { deliverWebhook } = await import('../../services/deliverWebhook.js');
const { computeSignature } = await import('../../services/sign.js');

const NOW = new Date('2026-10-07T10:00:00.000Z');

const delivery = (overrides: Record<string, unknown> = {}): any => ({
  webhook_delivery_id: 7,
  uuid: 'delivery-uuid',
  webhook_id: 1,
  topic: 'order_placed',
  attempts: 1,
  payload: {
    id: 'delivery-uuid',
    event_id: 'event-uuid',
    topic: 'order_placed',
    created_at: '2026-10-07T09:59:00.000Z',
    data: { order_id: 5 }
  },
  webhook_url: 'https://example.com/hook',
  webhook_secret: 'whsec_abc',
  ...overrides
});

describe('deliverWebhook', () => {
  let post: any;
  let markDelivered: any;
  let markAttemptFailed: any;
  let deps: any;

  beforeEach(() => {
    post = jest.fn();
    markDelivered = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    markAttemptFailed = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    deps = { post, markDelivered, markAttemptFailed, now: () => NOW };
  });

  it('marks the delivery delivered on a 2xx', async () => {
    post.mockResolvedValue({ ok: true, statusCode: 204, error: null });

    const outcome = await deliverWebhook(delivery(), {}, deps);

    expect(outcome).toEqual({ status: 'delivered', statusCode: 204, error: null });
    expect(markDelivered).toHaveBeenCalledWith(7, 204);
    expect(markAttemptFailed).not.toHaveBeenCalled();
  });

  it('POSTs the stored envelope with the documented headers', async () => {
    post.mockResolvedValue({ ok: true, statusCode: 200, error: null });
    const d = delivery();

    await deliverWebhook(d, {}, deps);

    const [url, headers, body] = post.mock.calls[0];
    expect(url).toBe('https://example.com/hook');
    expect(JSON.parse(body)).toEqual(d.payload);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['User-Agent']).toBe('EverShop-Webhook/1.0');
    expect(headers['X-EverShop-Topic']).toBe('order_placed');
    // Stable across retries: receivers dedupe on this.
    expect(headers['X-EverShop-Delivery']).toBe('delivery-uuid');
  });

  it('signs "<t>.<body>" with the webhook secret', async () => {
    post.mockResolvedValue({ ok: true, statusCode: 200, error: null });

    await deliverWebhook(delivery(), {}, deps);

    const [, headers, body] = post.mock.calls[0];
    const t = Math.floor(NOW.getTime() / 1000);
    expect(headers['X-EverShop-Signature']).toBe(
      `t=${t},v1=${computeSignature('whsec_abc', t, body)}`
    );
  });

  it.each([400, 404, 500, 503, 302])(
    'treats HTTP %s as a failure and schedules a retry',
    async (statusCode) => {
      post.mockResolvedValue({ ok: false, statusCode, error: null });

      const outcome = await deliverWebhook(delivery({ attempts: 1 }), {}, deps);

      expect(outcome.status).toBe('pending');
      expect(markDelivered).not.toHaveBeenCalled();
      expect(markAttemptFailed).toHaveBeenCalledWith(7, {
        status: 'pending',
        nextAttemptAt: new Date(NOW.getTime() + 60000),
        statusCode,
        error: null
      });
    }
  );

  it('records a network failure with no status code', async () => {
    post.mockResolvedValue({ ok: false, statusCode: null, error: 'ECONNREFUSED' });

    const outcome = await deliverWebhook(delivery(), {}, deps);

    expect(outcome).toEqual({
      status: 'pending',
      statusCode: null,
      error: 'ECONNREFUSED'
    });
    expect(markAttemptFailed).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ statusCode: null, error: 'ECONNREFUSED' })
    );
  });

  it('gives up on the last attempt', async () => {
    post.mockResolvedValue({ ok: false, statusCode: 500, error: null });

    const outcome = await deliverWebhook(delivery({ attempts: 5 }), {}, deps);

    expect(outcome.status).toBe('failed');
    expect(markAttemptFailed).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ status: 'failed', nextAttemptAt: null })
    );
  });

  it('fails at once, without a retry, when retry is off (test event)', async () => {
    post.mockResolvedValue({ ok: false, statusCode: 500, error: null });

    const outcome = await deliverWebhook(
      delivery({ attempts: 1 }),
      { retry: false },
      deps
    );

    expect(outcome.status).toBe('failed');
    expect(markAttemptFailed).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ status: 'failed', nextAttemptAt: null })
    );
  });
});
