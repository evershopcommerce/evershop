import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Migrate legacy Stripe payment statuses to the new prefixed values.
  // Only orders placed with payment_method = 'stripe' are affected.
  const statusMap: Record<string, string> = {
    authorized: 'stripe_authorized',
    failed: 'stripe_failed',
    refunded: 'stripe_refunded',
    paid: 'stripe_captured',
    partial_refunded: 'stripe_partial_refunded'
  };

  for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
    await execute(
      connection,
      `UPDATE "order"
       SET "payment_status" = '${newStatus}'
       WHERE "payment_method" = 'stripe'
         AND "payment_status" = '${oldStatus}'`
    );
  }
};
