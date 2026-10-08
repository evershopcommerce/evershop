import { pool } from '../../../lib/postgres/connection.js';
import type { WebhookDeliveryRow } from '../types/index.js';
import { WebhookNotFoundError, WebhookValidationError } from './errors.js';

/**
 * Queue a `failed` delivery for another full round of attempts. This only
 * resets the row; the cron job sends it within a minute (one send path, and
 * the API process never calls a webhook URL).
 */
export async function retryDelivery(uuid: string): Promise<WebhookDeliveryRow> {
  const { rows: found } = await pool.query(
    `SELECT d.status, w.enabled AS webhook_enabled
       FROM webhook_delivery d
       JOIN webhook w ON w.webhook_id = d.webhook_id
      WHERE d.uuid = $1`,
    [uuid]
  );
  if (found.length === 0) {
    throw new WebhookNotFoundError('Delivery not found');
  }
  if (found[0].status !== 'failed') {
    throw new WebhookValidationError('Only failed deliveries can be retried');
  }
  if (!found[0].webhook_enabled) {
    throw new WebhookValidationError(
      'Enable the webhook before retrying this delivery'
    );
  }
  const { rows } = await pool.query(
    `UPDATE webhook_delivery
        SET status = 'pending', attempts = 0, next_attempt_at = NOW(),
            last_error = NULL, last_status_code = NULL, completed_at = NULL,
            updated_at = NOW()
      WHERE uuid = $1 AND status = 'failed'
      RETURNING *`,
    [uuid]
  );
  if (rows.length === 0) {
    // Someone else retried it between the check and the update.
    throw new WebhookValidationError('Only failed deliveries can be retried');
  }
  return rows[0];
}
