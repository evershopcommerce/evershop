import { pool } from '../../../lib/postgres/connection.js';
import type { WebhookRow } from '../types/index.js';
import { WebhookNotFoundError } from './errors.js';

/** Delete a webhook; its deliveries go with it (cascading foreign key). */
export async function deleteWebhook(uuid: string): Promise<WebhookRow> {
  const { rows } = await pool.query(
    'DELETE FROM webhook WHERE uuid = $1 RETURNING *',
    [uuid]
  );
  if (rows.length === 0) {
    throw new WebhookNotFoundError('Webhook not found');
  }
  return rows[0];
}
