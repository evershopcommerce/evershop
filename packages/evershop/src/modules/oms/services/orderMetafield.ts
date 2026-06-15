import {
  update,
  type Pool,
  type PoolClient
} from '@evershop/postgres-query-builder';
import {
  createMetafieldDefinition,
  validateMetafield,
  validateMetafields,
  type CreateDefinitionInput,
  type MetaData
} from '../../../lib/metafield/index.js';
import { pool } from '../../../lib/postgres/connection.js';

const OWNER = 'order';

/** Create an order metafield definition (the core service with the owner baked in). */
export function addOrderMetafieldDefinition(
  input: Omit<CreateDefinitionInput, 'ownerType'>
) {
  return createMetafieldDefinition({ ...input, ownerType: OWNER });
}

/**
 * Set the full metafield value set for an order. Validates against the order
 * definitions and writes `meta_data` wholesale. ("order" is a reserved word, so
 * the query builder quotes the identifier.)
 */
export async function setOrderMetafields(
  orderId: number,
  values: MetaData,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const metaData = await validateMetafields(OWNER, values);
  await update('order')
    .given({ meta_data: metaData })
    .where('order_id', '=', orderId)
    .execute(connection);
}

/**
 * Set a single order metafield without touching the others (out-of-band path).
 * Targeted `jsonb_set` merge that creates the namespace object if missing.
 */
export async function setOrderMetafield(
  orderId: number,
  namespace: string,
  key: string,
  value: unknown,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const validated = await validateMetafield(OWNER, namespace, key, value);
  await connection.query(
    `UPDATE "order"
        SET meta_data = jsonb_set(
              meta_data,
              ARRAY[$2],
              COALESCE(meta_data -> $2, '{}'::jsonb) || jsonb_build_object($3, $4::jsonb),
              true)
      WHERE order_id = $1`,
    [orderId, namespace, key, JSON.stringify(validated)]
  );
}
