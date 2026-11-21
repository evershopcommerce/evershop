import {
  commit,
  getConnection,
  PoolClient,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import { emit } from '../../../lib/event/emitter.js';
import { debug } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import type { OrderRow } from '../../../types/db/index.js';

async function place(
  orderId: number,
  connection: PoolClient
): Promise<OrderRow | null> {
  // The UPDATE locks the row: a second caller waits for the first to commit,
  // then finds `placed_at` set and updates nothing
  const { rows } = await connection.query(
    `UPDATE "order" SET "placed_at" = NOW()
      WHERE "order_id" = $1 AND "placed_at" IS NULL
      RETURNING *`,
    [orderId]
  );
  const order: OrderRow | undefined = rows[0];
  if (!order) {
    debug(`Order ${orderId} is already placed, or does not exist`);
    return null;
  }
  // On the same connection: the event is saved with `placed_at` or not at all
  await emit('order_placed', { ...order }, connection);
  return order;
}

/**
 * Mark an order placed and emit `order_placed`, once per order.
 *
 * A payment method calls it at its own moment of success: when the gateway
 * accepts the payment (authorized or captured; for PayPal, also a capture
 * that is pending review), or when the order is created (an offline method
 * such as Cash on Delivery). It sets `order.placed_at` and emits
 * `order_placed` with the order row as it is now, in one transaction. The
 * first call wins; every later call, at the same time or not, changes
 * nothing, emits nothing and returns `null`. So a return page, a webhook and
 * a cron job can all call it for the same order.
 *
 * Call it after the payment status is updated, so the event carries the new
 * status. Pass `connection` to run inside your open transaction, started with
 * `startTransaction` (the event then exists only if your transaction
 * commits); any other connection is refused. Omit it to run in a transaction
 * of its own, but never while your own open transaction has updated or locked
 * the order: the call would wait for that transaction, which waits for the
 * call.
 *
 * @returns The placed order, or `null` when it was already placed or does not
 * exist.
 */
export async function markOrderPlaced(
  orderId: number,
  connection?: PoolClient
): Promise<OrderRow | null> {
  // A pool has no transaction to join
  if (connection && !(connection instanceof Pool)) {
    // Only startTransaction marks a connection as in a transaction. The event
    // insert hands any other back to the pool, in the middle of the caller's
    // work; and outside one transaction, `placed_at` is kept when the event
    // insert fails
    if ((connection as { INTRANSACTION?: boolean }).INTRANSACTION !== true) {
      throw new Error(
        'markOrderPlaced: the connection is not in a transaction. Start one with startTransaction, or pass no connection.'
      );
    }
    return place(orderId, connection);
  }
  const own = await getConnection(pool);
  try {
    await startTransaction(own);
    const order = await place(orderId, own);
    await commit(own);
    return order;
  } catch (e) {
    await rollback(own);
    throw e;
  }
}
