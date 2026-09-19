import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Per-entity metafield values (the single source of truth for customer
  // metafields), mirroring product.meta_data.
  await execute(
    connection,
    `ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "meta_data" jsonb NOT NULL DEFAULT '{}'`
  );
};
