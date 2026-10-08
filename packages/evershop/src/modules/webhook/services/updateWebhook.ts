import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../lib/postgres/connection.js';
import type { WebhookRow } from '../types/index.js';
import { assertWebhookUrl } from './assertWebhookUrl.js';
import type { WebhookInput } from './createWebhook.js';
import { cancelPendingForWebhook } from './deliveryStore.js';
import { WebhookNotFoundError } from './errors.js';
import { generateSecret } from './secret.js';
import { parseEnabled, validateName } from './validateWebhookInput.js';
import { assertValidTopics } from './webhookTopics.js';

export type WebhookUpdateInput = WebhookInput & {
  /** Replace the signing secret with a new one. */
  regenerateSecret?: unknown;
};

/**
 * Update the fields that were sent; leave the rest. Disabling a webhook
 * cancels its pending deliveries in the same transaction, so they cannot burst
 * out later if it is re-enabled.
 */
export async function updateWebhook(
  uuid: string,
  data: WebhookUpdateInput
): Promise<WebhookRow> {
  const params: unknown[] = [uuid];
  const sets: string[] = [];
  const add = (column: string, value: unknown, cast = ''): void => {
    params.push(value);
    sets.push(`${column} = $${params.length}${cast}`);
  };
  if (data.name !== undefined) {
    add('name', validateName(data.name));
  }
  if (data.url !== undefined) {
    add('url', assertWebhookUrl(data.url));
  }
  if (data.topics !== undefined) {
    add('topics', JSON.stringify(await assertValidTopics(data.topics)), '::jsonb');
  }
  if (data.enabled !== undefined) {
    add('enabled', parseEnabled(data.enabled, true));
  }
  if (data.regenerateSecret === true) {
    add('secret', generateSecret());
  }

  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { rows: existing } = await connection.query(
      'SELECT * FROM webhook WHERE uuid = $1 FOR UPDATE',
      [uuid]
    );
    if (existing.length === 0) {
      throw new WebhookNotFoundError('Webhook not found');
    }
    if (sets.length === 0) {
      await commit(connection);
      return existing[0];
    }
    const { rows } = await connection.query(
      `UPDATE webhook SET ${sets.join(', ')}, updated_at = NOW()
        WHERE uuid = $1 RETURNING *`,
      params
    );
    if (existing[0].enabled && !rows[0].enabled) {
      await cancelPendingForWebhook(rows[0].webhook_id, connection);
    }
    await commit(connection);
    return rows[0];
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
