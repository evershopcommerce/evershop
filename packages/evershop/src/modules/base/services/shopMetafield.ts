import { type Pool, type PoolClient } from '@evershop/postgres-query-builder';
import {
  createMetafieldDefinition,
  validateMetafield,
  validateMetafields,
  type CreateDefinitionInput,
  type MetaData
} from '../../../lib/metafield/index.js';
import { pool } from '../../../lib/postgres/connection.js';

const OWNER = 'shop';

/** Create a shop (store-wide) metafield definition. */
export function addShopMetafieldDefinition(
  input: Omit<CreateDefinitionInput, 'ownerType'>
) {
  return createMetafieldDefinition({ ...input, ownerType: OWNER });
}

/** Read the shop's metafield values from the `metafield_shop` singleton. */
export async function getShopMetaData(
  connection: Pool | PoolClient = pool
): Promise<MetaData> {
  const res = await connection.query(
    `SELECT meta_data FROM "metafield_shop" WHERE id = true LIMIT 1`
  );
  return (res.rows[0]?.meta_data as MetaData) ?? {};
}

/**
 * Set the full shop metafield value set. Validates against the shop definitions
 * and writes the `metafield_shop` singleton (upsert keeps it robust even if the
 * seed row is missing).
 */
export async function setShopMetafields(
  values: MetaData,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const metaData = await validateMetafields(OWNER, values);
  await connection.query(
    `INSERT INTO "metafield_shop" (id, meta_data) VALUES (true, $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET meta_data = EXCLUDED.meta_data`,
    [JSON.stringify(metaData)]
  );
}

/**
 * Set a single shop metafield without touching the others (out-of-band path).
 * Targeted `jsonb_set` merge on the singleton.
 */
export async function setShopMetafield(
  namespace: string,
  key: string,
  value: unknown,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const validated = await validateMetafield(OWNER, namespace, key, value);
  await connection.query(
    `UPDATE "metafield_shop"
        SET meta_data = jsonb_set(
              meta_data,
              ARRAY[$1],
              COALESCE(meta_data -> $1, '{}'::jsonb) || jsonb_build_object($2, $3::jsonb),
              true)
      WHERE id = true`,
    [namespace, key, JSON.stringify(validated)]
  );
}
