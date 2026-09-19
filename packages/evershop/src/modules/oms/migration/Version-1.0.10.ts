import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Per-entity metafield values (the single source of truth for order
  // metafields), mirroring product.meta_data. "order" is a reserved word.
  await execute(
    connection,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "meta_data" jsonb NOT NULL DEFAULT '{}'`
  );
};
