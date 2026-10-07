import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../lib/postgres/connection.js';
import type { WebhookRow } from '../types/index.js';
import { assertWebhookUrl } from './assertWebhookUrl.js';
import { MAX_WEBHOOKS } from './constants.js';
import { WebhookValidationError } from './errors.js';
import { generateSecret } from './secret.js';
import { parseEnabled, validateName } from './validateWebhookInput.js';
import { assertValidTopics } from './webhookTopics.js';

export type WebhookInput = {
  name?: unknown;
  url?: unknown;
  topics?: unknown;
  enabled?: unknown;
};

/**
 * Create a webhook. The signing secret is generated here, never supplied.
 * At most `MAX_WEBHOOKS` exist; the table lock makes that check race-free.
 */
export async function createWebhook(data: WebhookInput): Promise<WebhookRow> {
  const name = validateName(data.name);
  const url = assertWebhookUrl(data.url);
  const topics = await assertValidTopics(data.topics);
  const enabled = parseEnabled(data.enabled, true);

  const connection = await getConnection();
  await startTransaction(connection);
  try {
    await connection.query('LOCK TABLE webhook IN SHARE ROW EXCLUSIVE MODE');
    const { rows: counted } = await connection.query(
      'SELECT count(*)::int AS count FROM webhook'
    );
    if (counted[0].count >= MAX_WEBHOOKS) {
      throw new WebhookValidationError(
        `You can create at most ${MAX_WEBHOOKS} webhooks`
      );
    }
    const { rows } = await connection.query(
      `INSERT INTO webhook (name, url, secret, topics, enabled)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING *`,
      [name, url, generateSecret(), JSON.stringify(topics), enabled]
    );
    await commit(connection);
    return rows[0];
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
