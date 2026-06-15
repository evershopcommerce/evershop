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

const OWNER = 'category';

/** Create a category metafield definition (the core service with the owner baked in). */
export function addCategoryMetafieldDefinition(
  input: Omit<CreateDefinitionInput, 'ownerType'>
) {
  return createMetafieldDefinition({ ...input, ownerType: OWNER });
}

/**
 * Set the full metafield value set for a category (the form-save path). Validates
 * against the category definitions and writes `meta_data` wholesale.
 */
export async function setCategoryMetafields(
  categoryId: number,
  values: MetaData,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const metaData = await validateMetafields(OWNER, values);
  await update('category')
    .given({ meta_data: metaData })
    .where('category_id', '=', categoryId)
    .execute(connection);
}

/**
 * Set a single category metafield without touching the others (out-of-band path).
 * Targeted `jsonb_set` merge that creates the namespace object if missing.
 */
export async function setCategoryMetafield(
  categoryId: number,
  namespace: string,
  key: string,
  value: unknown,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const validated = await validateMetafield(OWNER, namespace, key, value);
  await connection.query(
    `UPDATE "category"
        SET meta_data = jsonb_set(
              meta_data,
              ARRAY[$2],
              COALESCE(meta_data -> $2, '{}'::jsonb) || jsonb_build_object($3, $4::jsonb),
              true)
      WHERE category_id = $1`,
    [categoryId, namespace, key, JSON.stringify(validated)]
  );
}
