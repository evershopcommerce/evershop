import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Per-entity metafield values (the single source of truth for product metafields).
  await execute(
    connection,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "meta_data" jsonb NOT NULL DEFAULT '{}'`
  );
};
