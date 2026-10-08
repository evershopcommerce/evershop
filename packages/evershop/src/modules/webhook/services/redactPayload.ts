import { getValue } from '../../../lib/util/registry.js';

/**
 * Keys removed from every webhook payload, at any depth. The customer events
 * come from a database trigger that sends the whole row, so without this a
 * `customer_*` payload would carry the password hash.
 *
 * Extensions add keys with `addProcessor('webhookRedactedFields', ...)`.
 * This is a STABLE list on purpose: the registry keeps one cached result per
 * key, so it must never be fed per-event data (concurrent events would race
 * on that cache and one event could receive another's payload).
 */
const DEFAULT_REDACTED_FIELDS = ['password'];

export async function getRedactedFields(): Promise<string[]> {
  return getValue<string[]>('webhookRedactedFields', DEFAULT_REDACTED_FIELDS);
}

/** Copy of `value` without any key listed in `fields`, at every depth. */
export function redactPayload(value: unknown, fields: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactPayload(item, fields));
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (!fields.includes(key)) {
        out[key] = redactPayload(item, fields);
      }
    });
    return out;
  }
  return value;
}

export async function sanitizeWebhookPayload(data: unknown): Promise<unknown> {
  return redactPayload(data, await getRedactedFields());
}
