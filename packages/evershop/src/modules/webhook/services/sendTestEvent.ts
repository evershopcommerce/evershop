import crypto from 'crypto';
import { pool } from '../../../lib/postgres/connection.js';
import type { WebhookEnvelope, WebhookRow } from '../types/index.js';
import { PING_TOPIC } from './constants.js';
import { deliverWebhook } from './deliverWebhook.js';
import { insertDeliveries } from './deliveryStore.js';
import { WebhookNotFoundError } from './errors.js';

export type TestEventResult = {
  deliveryUuid: string;
  status: 'delivered' | 'failed';
  statusCode: number | null;
  error: string | null;
};

/**
 * Send one `webhook_ping` to a webhook NOW and report the result, so an admin
 * can check a URL and secret without waiting for a real event.
 *
 * Differences from a real delivery: it ignores the topic list, works for a
 * disabled webhook, is not retried automatically, and is sent from the API
 * process (the one exception to "the cron job sends"). It goes through the same
 * guarded `postWebhook`, and is stored like any other delivery, so it shows up
 * in the list and can be retried from there.
 */
export async function sendTestEvent(
  webhookUuid: string
): Promise<TestEventResult> {
  const { rows } = await pool.query('SELECT * FROM webhook WHERE uuid = $1', [
    webhookUuid
  ]);
  if (rows.length === 0) {
    throw new WebhookNotFoundError('Webhook not found');
  }
  const webhook: WebhookRow = rows[0];

  const id = crypto.randomUUID();
  const payload: WebhookEnvelope = {
    id,
    event_id: null,
    topic: PING_TOPIC,
    created_at: new Date().toISOString(),
    data: {
      message: 'Test event from EverShop',
      webhook_uuid: webhook.uuid
    }
  };
  const [delivery] = await insertDeliveries([
    {
      uuid: id,
      webhookId: webhook.webhook_id,
      topic: PING_TOPIC,
      eventUuid: null,
      payload,
      status: 'sending',
      attempts: 1
    }
  ]);

  const outcome = await deliverWebhook(
    { ...delivery, webhook_url: webhook.url, webhook_secret: webhook.secret },
    { retry: false }
  );
  return {
    deliveryUuid: id,
    status: outcome.status === 'delivered' ? 'delivered' : 'failed',
    statusCode: outcome.statusCode,
    error: outcome.error
  };
}
