import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

/**
 * `stripe_payment_intent`: every PaymentIntent created for an order. The
 * payment step creates one each time it loads, and the order learns an
 * intent's id only once it succeeds (`payment_transaction`), so without this
 * table nothing could ask Stripe what became of an order that was never paid.
 * The abandoned order job (`services/reconcileAbandonedOrders.ts`) reads it.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `CREATE TABLE "stripe_payment_intent" (
      "stripe_payment_intent_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "order_id" INT NOT NULL,
      "payment_intent_id" varchar NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "STRIPE_PAYMENT_INTENT_ID_UNIQUE" UNIQUE ("payment_intent_id"),
      CONSTRAINT "FK_STRIPE_PAYMENT_INTENT_ORDER" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE
    )`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_STRIPE_PAYMENT_INTENT_ORDER_ID" ON "stripe_payment_intent" ("order_id")`
  );
};
