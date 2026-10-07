import type { WebhookRow } from '../types/index.js';

export type WebhookTarget = {
  webhook: WebhookRow;
  /** Pending deliveries for this webhook (cached, see `webhookCache`). */
  pending: number;
};

export type MatchResult = {
  /** Webhooks that should get a delivery for this event. */
  matched: WebhookRow[];
  /** Webhooks that wanted it but are at the pending ceiling (backlog guard). */
  saturated: WebhookRow[];
};

/**
 * Which webhooks should receive an event with this topic. Pure: the caller
 * supplies the cached targets and the ceiling.
 */
export function matchWebhooks(
  targets: WebhookTarget[],
  topic: string,
  ceiling: number
): MatchResult {
  const matched: WebhookRow[] = [];
  const saturated: WebhookRow[] = [];
  targets.forEach(({ webhook, pending }) => {
    if (!webhook.enabled || !webhook.topics.includes(topic)) {
      return;
    }
    if (pending >= ceiling) {
      saturated.push(webhook);
    } else {
      matched.push(webhook);
    }
  });
  return { matched, saturated };
}
