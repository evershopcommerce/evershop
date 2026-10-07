import { describe, it, expect } from '@jest/globals';
import { matchWebhooks } from '../../services/matchWebhooks.js';
import type { WebhookRow } from '../../types/index.js';

const hook = (id: number, topics: string[], enabled = true): WebhookRow => ({
  webhook_id: id,
  uuid: `uuid-${id}`,
  name: `hook ${id}`,
  url: 'https://example.com',
  secret: 's',
  topics,
  enabled,
  created_at: '',
  updated_at: ''
});

describe('matchWebhooks', () => {
  it('matches the webhooks that subscribed to the topic', () => {
    const { matched, saturated } = matchWebhooks(
      [
        { webhook: hook(1, ['order_placed']), pending: 0 },
        { webhook: hook(2, ['product_created']), pending: 0 },
        { webhook: hook(3, ['order_placed', 'product_created']), pending: 0 }
      ],
      'order_placed',
      100
    );
    expect(matched.map((w) => w.webhook_id)).toEqual([1, 3]);
    expect(saturated).toEqual([]);
  });

  it('ignores a disabled webhook even if the cache still holds it', () => {
    const { matched } = matchWebhooks(
      [{ webhook: hook(1, ['order_placed'], false), pending: 0 }],
      'order_placed',
      100
    );
    expect(matched).toEqual([]);
  });

  it('puts a webhook at the pending ceiling in `saturated`, not `matched`', () => {
    const { matched, saturated } = matchWebhooks(
      [
        { webhook: hook(1, ['order_placed']), pending: 100 },
        { webhook: hook(2, ['order_placed']), pending: 99 }
      ],
      'order_placed',
      100
    );
    expect(matched.map((w) => w.webhook_id)).toEqual([2]);
    expect(saturated.map((w) => w.webhook_id)).toEqual([1]);
  });

  it('reports a saturated webhook only for topics it wants', () => {
    const { saturated } = matchWebhooks(
      [{ webhook: hook(1, ['product_created']), pending: 500 }],
      'order_placed',
      100
    );
    expect(saturated).toEqual([]);
  });
});
