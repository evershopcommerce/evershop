import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import type { WebhookRow } from '../types/index.js';
import { WEBHOOK_CACHE_TTL_MS } from './constants.js';
import type { WebhookTarget } from './matchWebhooks.js';

/**
 * In-process cache of the enabled webhooks and each one's pending count. The
 * subscriber runs for EVERY event (a bulk import emits thousands), so it must
 * not query the database per event. A change to a webhook is picked up within
 * `ttlMs`; the pending count is also bumped locally as deliveries are created,
 * and the next refresh corrects it as the cron job drains rows.
 */
export function createWebhookCache(
  load: () => Promise<WebhookTarget[]>,
  ttlMs: number = WEBHOOK_CACHE_TTL_MS,
  clock: () => number = Date.now
) {
  let targets: WebhookTarget[] | null = null;
  let loadedAt = 0;
  let inFlight: Promise<void> | null = null;

  const refresh = async (): Promise<void> => {
    targets = await load();
    loadedAt = clock();
  };

  return {
    async getTargets(): Promise<WebhookTarget[]> {
      if (targets && clock() - loadedAt < ttlMs) {
        return targets;
      }
      // A batch of events arrives together: share one refresh between them.
      if (!inFlight) {
        inFlight = refresh().finally(() => {
          inFlight = null;
        });
      }
      await inFlight;
      return targets as WebhookTarget[];
    },

    recordEnqueued(webhookId: number, count: number): void {
      const target = targets?.find((t) => t.webhook.webhook_id === webhookId);
      if (target) {
        target.pending += count;
      }
    },

    reset(): void {
      targets = null;
      loadedAt = 0;
      inFlight = null;
    }
  };
}

async function loadTargetsFromDb(): Promise<WebhookTarget[]> {
  const webhooks = (await select()
    .from('webhook')
    .where('enabled', '=', true)
    .execute(pool)) as WebhookRow[];
  if (webhooks.length === 0) {
    return [];
  }
  const counts = await pool.query(
    `SELECT webhook_id, count(*)::int AS count
       FROM webhook_delivery
      WHERE status = 'pending'
      GROUP BY webhook_id`
  );
  const pendingByWebhook = new Map<number, number>(
    counts.rows.map((r) => [r.webhook_id, r.count])
  );
  return webhooks.map((webhook) => ({
    webhook,
    pending: pendingByWebhook.get(webhook.webhook_id) ?? 0
  }));
}

export const webhookCache = createWebhookCache(loadTargetsFromDb);
