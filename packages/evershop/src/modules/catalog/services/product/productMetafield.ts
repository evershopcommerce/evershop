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
} from '../../../../lib/metafield/index.js';
import { pool } from '../../../../lib/postgres/connection.js';

const OWNER = 'product';

/** Create a product metafield definition (the core service with the owner baked in). */
export function addProductMetafieldDefinition(
  input: Omit<CreateDefinitionInput, 'ownerType'>
) {
  return createMetafieldDefinition({ ...input, ownerType: OWNER });
}

/**
 * Set the full metafield value set for a product (the form-save path). Validates
 * against the product definitions and writes `meta_data` wholesale.
 */
export async function setProductMetafields(
  productId: number,
  values: MetaData,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const metaData = await validateMetafields(OWNER, values);
  await update('product')
    .given({ meta_data: metaData })
    .where('product_id', '=', productId)
    .execute(connection);
}

/**
 * Set a single product metafield without touching the others (out-of-band path,
 * e.g. an extension writing a computed value). Targeted `jsonb_set` merge that
 * creates the namespace object if missing.
 */
export async function setProductMetafield(
  productId: number,
  namespace: string,
  key: string,
  value: unknown,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const validated = await validateMetafield(OWNER, namespace, key, value);
  await connection.query(
    `UPDATE "product"
        SET meta_data = jsonb_set(
              meta_data,
              ARRAY[$2],
              COALESCE(meta_data -> $2, '{}'::jsonb) || jsonb_build_object($3, $4::jsonb),
              true)
      WHERE product_id = $1`,
    [productId, namespace, key, JSON.stringify(validated)]
  );
}
