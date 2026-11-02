import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // When the order was placed: set once by markOrderPlaced, which emits
  // `order_placed` only when it sets it. NULL while the order waits for its
  // payment, and for an order whose payment failed or was never made.
  await execute(
    connection,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "placed_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL`
  );

  // Existing orders that were placed (their `order_placed` was emitted) get
  // their creation time, so a late payment event never places them again. An
  // order counts as placed when its payment went further than pending,
  // failed or canceled, when a payment was recorded for it (a PayPal payment
  // that went pending and then failed), or when it is a Cash on Delivery
  // order (placed when created, canceled or not). A card order canceled
  // before any payment, or one whose payment failed, stays unplaced; it is
  // placed if its payment succeeds later. importOrder uses the same rule
  // (wasOrderPlaced).
  //
  // The SET_UPDATED_AT trigger (checkout 1.0.14) would set every backfilled
  // order's `updated_at` to the upgrade time: it is off for this UPDATE only.
  // One DO block, so the trigger is never left off, in a transaction or not.
  await execute(
    connection,
    `DO $$
    DECLARE
      has_trigger boolean := EXISTS (
        SELECT 1 FROM pg_trigger
         WHERE tgrelid = '"order"'::regclass AND tgname = 'SET_UPDATED_AT'
           AND tgenabled = 'O'
      );
    BEGIN
      IF has_trigger THEN
        ALTER TABLE "order" DISABLE TRIGGER "SET_UPDATED_AT";
      END IF;
      UPDATE "order" o
         SET "placed_at" = COALESCE(o."created_at", o."updated_at", NOW())
       WHERE o."placed_at" IS NULL
         AND (
           (o."payment_status" NOT IN ('pending', 'canceled')
             AND o."payment_status" NOT LIKE '%failed')
           OR o."payment_method" = 'cod'
           OR EXISTS (
             SELECT 1 FROM "payment_transaction" t
              WHERE t."payment_transaction_order_id" = o."order_id"
           )
         );
      IF has_trigger THEN
        ALTER TABLE "order" ENABLE TRIGGER "SET_UPDATED_AT";
      END IF;
    END $$`
  );
};
