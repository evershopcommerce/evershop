import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Per-entity metafield values (the single source of truth for category and
  // collection metafields), mirroring product.meta_data (Version-1.0.10).
  await execute(
    connection,
    `ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "meta_data" jsonb NOT NULL DEFAULT '{}'`
  );
  await execute(
    connection,
    `ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "meta_data" jsonb NOT NULL DEFAULT '{}'`
  );
};
