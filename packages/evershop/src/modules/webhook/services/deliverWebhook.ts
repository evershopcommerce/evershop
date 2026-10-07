import type { ClaimedDelivery } from '../types/index.js';
import { planAfterFailure } from './backoff.js';
import { markAttemptFailed, markDelivered } from './deliveryStore.js';
import { buildSignatureHeader } from './sign.js';
import { postWebhook } from './webhookFetch.js';

export type DeliverOutcome = {
  /** `pending` means the attempt failed and a retry is scheduled. */
  status: 'delivered' | 'pending' | 'failed';
  statusCode: number | null;
  error: string | null;
};

export type DeliverDeps = {
  post: typeof postWebhook;
  markDelivered: typeof markDelivered;
  markAttemptFailed: typeof markAttemptFailed;
  now: () => Date;
};

const defaultDeps: DeliverDeps = {
  post: postWebhook,
  markDelivered,
  markAttemptFailed,
  now: () => new Date()
};

/**
 * Send one CLAIMED delivery (status `sending`, `attempts` already counted) and
 * record the result. The single send path: the subscriber (first attempt), the
 * cron job (retries) and the test action all come through here.
 *
 * `retry: false` (the test event) turns a failure into a final `failed`
 * instead of scheduling a retry.
 */
export async function deliverWebhook(
  delivery: ClaimedDelivery,
  options: { retry?: boolean } = {},
  deps: DeliverDeps = defaultDeps
): Promise<DeliverOutcome> {
  const body = JSON.stringify(delivery.payload);
  const now = deps.now();
  const result = await deps.post(
    delivery.webhook_url,
    {
      'Content-Type': 'application/json',
      'User-Agent': 'EverShop-Webhook/1.0',
      'X-EverShop-Topic': delivery.topic,
      'X-EverShop-Delivery': delivery.uuid,
      'X-EverShop-Signature': buildSignatureHeader(
        delivery.webhook_secret,
        body,
        now.getTime()
      )
    },
    body
  );

  if (result.ok) {
    await deps.markDelivered(
      delivery.webhook_delivery_id,
      result.statusCode as number
    );
    return { status: 'delivered', statusCode: result.statusCode, error: null };
  }

  const plan = planAfterFailure(
    delivery.attempts,
    deps.now(),
    options.retry !== false
  );
  await deps.markAttemptFailed(delivery.webhook_delivery_id, {
    status: plan.status,
    nextAttemptAt: plan.nextAttemptAt,
    statusCode: result.statusCode,
    error: result.error
  });
  return {
    status: plan.status,
    statusCode: result.statusCode,
    error: result.error
  };
}
