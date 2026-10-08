import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Backfill existing COD orders into the unified payment-operation contract.
  //
  // Before this release a placed COD order sat in the shared `pending` status
  // with no payment_transaction, and capture went through a COD-specific route.
  // The unified capture flow needs each capturable order to be in a capturable
  // status (`cod_pending`) AND to have an `authorize` transaction for
  // `captureOrder` to settle. Bring pending COD orders up to that shape:
  //   1. record an offline `authorize` transaction for the amount to collect
  //      (skip any order that already has one — idempotent), then
  //   2. move the order from `pending` to `cod_pending`.
  //
  // Status-neutral: `cod_pending` maps to the same order status as `pending`
  // (`cod_pending:pending` → new, `cod_pending:*` → processing), so order.status
  // is unchanged. Orders already captured (base `paid`) or refunded are left
  // alone — only orders still awaiting payment are migrated.
  await execute(
    connection,
    `INSERT INTO "payment_transaction"
       ("payment_transaction_order_id", "transaction_id", "amount", "transaction_type", "payment_action")
     SELECT o."order_id", 'cod-authorize-' || o."uuid"::text, o."grand_total", 'offline', 'authorize'
     FROM "order" o
     WHERE o."payment_method" = 'cod'
       AND o."payment_status" = 'pending'
       AND NOT EXISTS (
         SELECT 1 FROM "payment_transaction" pt
         WHERE pt."payment_transaction_order_id" = o."order_id"
           AND pt."payment_action" = 'authorize'
       )`
  );

  await execute(
    connection,
    `UPDATE "order"
     SET "payment_status" = 'cod_pending'
     WHERE "payment_method" = 'cod'
       AND "payment_status" = 'pending'`
  );
};
