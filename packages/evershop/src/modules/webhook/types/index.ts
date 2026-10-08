export type WebhookDeliveryStatus =
  | 'pending'
  | 'sending'
  | 'delivered'
  | 'failed'
  | 'canceled';

export interface WebhookRow {
  webhook_id: number;
  uuid: string;
  name: string;
  url: string;
  secret: string;
  topics: string[];
  enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * The JSON body sent to the receiver. Stored as-is in
 * `webhook_delivery.payload` so a retry sends exactly what the first attempt
 * did (apart from the signature timestamp).
 */
export interface WebhookEnvelope {
  /** The delivery uuid. Stable across retries; receivers dedupe on it. */
  id: string;
  /** The uuid of the `event` row that caused this delivery; null for a test. */
  event_id: string | null;
  topic: string;
  created_at: string;
  data: unknown;
}

export interface WebhookDeliveryRow {
  webhook_delivery_id: number;
  uuid: string;
  webhook_id: number;
  topic: string;
  event_uuid: string | null;
  payload: WebhookEnvelope;
  status: WebhookDeliveryStatus;
  attempts: number;
  next_attempt_at: Date | string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  last_status_code: number | null;
  last_error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/** A delivery row joined with the URL and secret needed to send it. */
export interface ClaimedDelivery extends WebhookDeliveryRow {
  webhook_url: string;
  webhook_secret: string;
}

export interface WebhookTopic {
  /** The event name, e.g. `order_placed`. */
  name: string;
  label: string;
  description: string;
  group: string;
}
