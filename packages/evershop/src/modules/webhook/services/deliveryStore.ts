import type { Pool, PoolClient } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import type {
  ClaimedDelivery,
  WebhookDeliveryRow,
  WebhookEnvelope
} from '../types/index.js';
import {
  FAILED_RETENTION_DAYS,
  MAX_ATTEMPTS,
  STUCK_SENDING_MINUTES
} from './constants.js';

type Queryable = Pool | PoolClient;

export type NewDelivery = {
  uuid: string;
  webhookId: number;
  topic: string;
  eventUuid: string | null;
  payload: WebhookEnvelope;
  /** `sending` is used by the test event, which is sent at once. */
  status?: 'pending' | 'sending';
  attempts?: number;
};

const CLAIM_RETURNING = `RETURNING d.*, w.url AS webhook_url, w.secret AS webhook_secret`;

/** Insert deliveries in one statement. Returns the inserted rows. */
export async function insertDeliveries(
  rows: NewDelivery[],
  db: Queryable = pool
): Promise<WebhookDeliveryRow[]> {
  if (rows.length === 0) {
    return [];
  }
  const params: unknown[] = [];
  const tuples = rows.map((row) => {
    const base = params.length;
    params.push(
      row.uuid,
      row.webhookId,
      row.topic,
      row.eventUuid,
      JSON.stringify(row.payload),
      row.status ?? 'pending',
      row.attempts ?? 0
    );
    const p = (n: number) => `$${base + n}`;
    return `(${p(1)}::uuid, ${p(2)}::int, ${p(3)}::varchar, ${p(4)}::uuid, ${p(
      5
    )}::jsonb, ${p(6)}::varchar, ${p(7)}::int,
      CASE WHEN ${p(6)}::varchar = 'sending' THEN NOW() END)`;
  });
  const result = await db.query(
    `INSERT INTO webhook_delivery
       (uuid, webhook_id, topic, event_uuid, payload, status, attempts, started_at)
     VALUES ${tuples.join(', ')}
     RETURNING *`,
    params
  );
  return result.rows;
}

/**
 * Claim these deliveries for sending: `pending` -> `sending`, attempts + 1.
 * Same primitive as `EventStorage.claimBatch` (`FOR UPDATE SKIP LOCKED`), so a
 * row is never sent by two workers. Rows of a disabled webhook are not claimed.
 */
export async function claimByIds(
  ids: number[],
  db: Queryable = pool
): Promise<ClaimedDelivery[]> {
  if (ids.length === 0) {
    return [];
  }
  const result = await db.query(
    `WITH claimed AS (
       SELECT d.webhook_delivery_id
         FROM webhook_delivery d
         JOIN webhook w ON w.webhook_id = d.webhook_id
        WHERE d.webhook_delivery_id = ANY($1::int[])
          AND d.status = 'pending'
          AND w.enabled = true
        ORDER BY d.webhook_delivery_id
          FOR UPDATE OF d SKIP LOCKED
     )
     UPDATE webhook_delivery d
        SET status = 'sending', attempts = d.attempts + 1,
            started_at = NOW(), updated_at = NOW()
       FROM claimed c, webhook w
      WHERE d.webhook_delivery_id = c.webhook_delivery_id
        AND w.webhook_id = d.webhook_id
     ${CLAIM_RETURNING}`,
    [ids]
  );
  return result.rows;
}

/** Claim up to `limit` pending deliveries whose retry time has come. */
export async function claimDue(
  limit: number,
  db: Queryable = pool
): Promise<ClaimedDelivery[]> {
  const result = await db.query(
    `WITH claimed AS (
       SELECT d.webhook_delivery_id
         FROM webhook_delivery d
         JOIN webhook w ON w.webhook_id = d.webhook_id
        WHERE d.status = 'pending'
          AND d.next_attempt_at <= NOW()
          AND w.enabled = true
        ORDER BY d.next_attempt_at, d.webhook_delivery_id
        LIMIT $1
          FOR UPDATE OF d SKIP LOCKED
     )
     UPDATE webhook_delivery d
        SET status = 'sending', attempts = d.attempts + 1,
            started_at = NOW(), updated_at = NOW()
       FROM claimed c, webhook w
      WHERE d.webhook_delivery_id = c.webhook_delivery_id
        AND w.webhook_id = d.webhook_id
     ${CLAIM_RETURNING}`,
    [limit]
  );
  return result.rows;
}

/**
 * The `status = 'sending'` guard on the two writes below means a late result
 * can never overwrite a row that was reclaimed and re-sent in the meantime.
 */
export async function markDelivered(
  id: number,
  statusCode: number,
  db: Queryable = pool
): Promise<void> {
  await db.query(
    `UPDATE webhook_delivery
        SET status = 'delivered', last_status_code = $2, last_error = NULL,
            completed_at = NOW(), updated_at = NOW()
      WHERE webhook_delivery_id = $1 AND status = 'sending'`,
    [id, statusCode]
  );
}

export async function markAttemptFailed(
  id: number,
  result: {
    status: 'pending' | 'failed';
    nextAttemptAt: Date | null;
    statusCode: number | null;
    error: string | null;
  },
  db: Queryable = pool
): Promise<void> {
  await db.query(
    `UPDATE webhook_delivery
        SET status = $2::varchar,
            next_attempt_at = COALESCE($3::timestamptz, next_attempt_at),
            last_status_code = $4::int,
            last_error = $5::varchar,
            completed_at = CASE WHEN $2::varchar = 'failed' THEN NOW() ELSE NULL END,
            updated_at = NOW()
      WHERE webhook_delivery_id = $1 AND status = 'sending'`,
    [id, result.status, result.nextAttemptAt, result.statusCode, result.error]
  );
}

/**
 * Crash recovery: a `sending` row older than `STUCK_SENDING_MINUTES` lost its
 * worker. Unlike the event system (which marks stuck events failed), a webhook
 * is sent again, so delivery is at-least-once and the receiver dedupes on the
 * delivery id. A row already at the attempt limit is failed instead.
 */
export async function reclaimStuck(db: Queryable = pool): Promise<number> {
  const result = await db.query(
    `UPDATE webhook_delivery
        SET status = CASE WHEN attempts >= $1::int THEN 'failed' ELSE 'pending' END,
            next_attempt_at = NOW(),
            last_error = 'Interrupted before a result was recorded',
            completed_at = CASE WHEN attempts >= $1::int THEN NOW() ELSE NULL END,
            updated_at = NOW()
      WHERE status = 'sending'
        AND started_at < NOW() - make_interval(mins => $2::int)`,
    [MAX_ATTEMPTS, STUCK_SENDING_MINUTES]
  );
  return result.rowCount ?? 0;
}

/** Cancel the pending deliveries of one webhook (it was just disabled). */
export async function cancelPendingForWebhook(
  webhookId: number,
  db: Queryable = pool
): Promise<number> {
  const result = await db.query(
    `UPDATE webhook_delivery
        SET status = 'canceled', completed_at = NOW(), updated_at = NOW()
      WHERE webhook_id = $1 AND status = 'pending'`,
    [webhookId]
  );
  return result.rowCount ?? 0;
}

/**
 * Self-healing: the subscriber's cache can be up to a few seconds stale, so a
 * delivery can be created for a webhook that was disabled a moment ago.
 */
export async function cancelPendingForDisabled(
  db: Queryable = pool
): Promise<number> {
  const result = await db.query(
    `UPDATE webhook_delivery d
        SET status = 'canceled', completed_at = NOW(), updated_at = NOW()
       FROM webhook w
      WHERE w.webhook_id = d.webhook_id
        AND w.enabled = false
        AND d.status = 'pending'`
  );
  return result.rowCount ?? 0;
}

/**
 * Keep the newest `limit` finished rows (`delivered` / `canceled`) per webhook.
 * `pending` and `sending` rows are the retry queue and are never touched.
 */
export async function trimFinished(
  limit: number,
  db: Queryable = pool
): Promise<number> {
  const result = await db.query(
    `DELETE FROM webhook_delivery
      WHERE webhook_delivery_id IN (
        SELECT webhook_delivery_id FROM (
          SELECT webhook_delivery_id,
                 row_number() OVER (
                   PARTITION BY webhook_id ORDER BY webhook_delivery_id DESC
                 ) AS position
            FROM webhook_delivery
           WHERE status IN ('delivered', 'canceled')
        ) ranked
        WHERE position > $1::int
      )`,
    [limit]
  );
  return result.rowCount ?? 0;
}

/** Delete final `failed` rows older than the retention period. */
export async function trimFailed(db: Queryable = pool): Promise<number> {
  const result = await db.query(
    `DELETE FROM webhook_delivery
      WHERE status = 'failed'
        AND completed_at < NOW() - make_interval(days => $1::int)`,
    [FAILED_RETENTION_DAYS]
  );
  return result.rowCount ?? 0;
}
