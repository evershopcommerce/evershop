import crypto from 'crypto';
import { error as logError, warning } from '../../../lib/log/logger.js';
import type {
  ClaimedDelivery,
  WebhookDeliveryRow,
  WebhookEnvelope
} from '../types/index.js';
import { MAX_PENDING_PER_WEBHOOK, WARN_INTERVAL_MS } from './constants.js';
import { deliverWebhook } from './deliverWebhook.js';
import { claimByIds, insertDeliveries, type NewDelivery } from './deliveryStore.js';
import { matchWebhooks, type WebhookTarget } from './matchWebhooks.js';
import { sanitizeWebhookPayload } from './redactPayload.js';
import { webhookCache } from './webhookCache.js';

export type EnqueueDeps = {
  getTargets: () => Promise<WebhookTarget[]>;
  recordEnqueued: (webhookId: number, count: number) => void;
  sanitize: (data: unknown) => Promise<unknown>;
  insert: (rows: NewDelivery[]) => Promise<WebhookDeliveryRow[]>;
  claim: (ids: number[]) => Promise<ClaimedDelivery[]>;
  deliver: (delivery: ClaimedDelivery) => Promise<unknown>;
  warn: (message: string) => void;
  logError: (e: unknown) => void;
  now: () => Date;
  newId: () => string;
};

const lastWarnAt = new Map<number, number>();

const defaultDeps: EnqueueDeps = {
  getTargets: () => webhookCache.getTargets(),
  recordEnqueued: (id, count) => webhookCache.recordEnqueued(id, count),
  sanitize: sanitizeWebhookPayload,
  insert: (rows) => insertDeliveries(rows),
  claim: (ids) => claimByIds(ids),
  deliver: (delivery) => deliverWebhook(delivery),
  warn: (message) => warning(message),
  logError: (e) => logError(e),
  now: () => new Date(),
  newId: () => crypto.randomUUID()
};

/**
 * The write-first half of the webhook pipeline, called by the wildcard
 * subscriber for every event.
 *
 *  1. find the enabled webhooks that want this topic (cached),
 *  2. skip any webhook already at the pending ceiling (backlog guard),
 *  3. strip secrets from the payload,
 *  4. INSERT one `webhook_delivery` row per webhook   <- from here the event
 *     itself no longer matters; the row owns delivery and retries,
 *  5. claim those rows and make the first attempt now.
 */
export async function enqueueDeliveries(
  topic: string,
  data: unknown,
  eventUuid: string | null,
  deps: EnqueueDeps = defaultDeps
): Promise<{ enqueued: number; skipped: number }> {
  const targets = await deps.getTargets();
  const { matched, saturated } = matchWebhooks(
    targets,
    topic,
    MAX_PENDING_PER_WEBHOOK
  );

  saturated.forEach((webhook) => {
    const last = lastWarnAt.get(webhook.webhook_id) ?? 0;
    if (deps.now().getTime() - last >= WARN_INTERVAL_MS) {
      lastWarnAt.set(webhook.webhook_id, deps.now().getTime());
      deps.warn(
        `Webhook "${webhook.name}" has ${MAX_PENDING_PER_WEBHOOK} pending deliveries; new "${topic}" events are skipped until it catches up.`
      );
    }
  });

  if (matched.length === 0) {
    return { enqueued: 0, skipped: saturated.length };
  }

  const payloadData = await deps.sanitize(data);
  const createdAt = deps.now().toISOString();
  const rows: NewDelivery[] = matched.map((webhook) => {
    const id = deps.newId();
    const payload: WebhookEnvelope = {
      id,
      event_id: eventUuid,
      topic,
      created_at: createdAt,
      data: payloadData
    };
    return {
      uuid: id,
      webhookId: webhook.webhook_id,
      topic,
      eventUuid,
      payload
    };
  });

  const inserted = await deps.insert(rows);
  matched.forEach((webhook) => deps.recordEnqueued(webhook.webhook_id, 1));

  const claimed = await deps.claim(
    inserted.map((row) => row.webhook_delivery_id)
  );
  const results = await Promise.allSettled(
    claimed.map((delivery) => deps.deliver(delivery))
  );
  results.forEach((result) => {
    if (result.status === 'rejected') {
      deps.logError(result.reason);
    }
  });
  return { enqueued: inserted.length, skipped: saturated.length };
}
