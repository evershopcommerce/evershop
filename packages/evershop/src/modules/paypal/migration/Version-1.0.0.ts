import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Migrate legacy Stripe payment statuses to the new prefixed values.
  // Only orders placed with payment_method = 'paypal' are affected.
  const statusMap: Record<string, string> = {
    authorized: 'paypal_authorized',
    failed: 'paypal_failed',
    refunded: 'paypal_refunded',
    partial_refunded: 'paypal_partial_refunded',
    paid: 'paypal_captured'
  };

  for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
    await execute(
      connection,
      `UPDATE "order"
       SET "payment_status" = '${newStatus}'
       WHERE "payment_method" = 'paypal'
         AND "payment_status" = '${oldStatus}'`
    );
  }
};
