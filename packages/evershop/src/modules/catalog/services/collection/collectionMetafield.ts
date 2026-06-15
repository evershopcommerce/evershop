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

const OWNER = 'collection';

/** Create a collection metafield definition (the core service with the owner baked in). */
export function addCollectionMetafieldDefinition(
  input: Omit<CreateDefinitionInput, 'ownerType'>
) {
  return createMetafieldDefinition({ ...input, ownerType: OWNER });
}

/**
 * Set the full metafield value set for a collection (the form-save path).
 * Validates against the collection definitions and writes `meta_data` wholesale.
 */
export async function setCollectionMetafields(
  collectionId: number,
  values: MetaData,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const metaData = await validateMetafields(OWNER, values);
  await update('collection')
    .given({ meta_data: metaData })
    .where('collection_id', '=', collectionId)
    .execute(connection);
}

/**
 * Set a single collection metafield without touching the others (out-of-band
 * path). Targeted `jsonb_set` merge that creates the namespace object if missing.
 */
export async function setCollectionMetafield(
  collectionId: number,
  namespace: string,
  key: string,
  value: unknown,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const validated = await validateMetafield(OWNER, namespace, key, value);
  await connection.query(
    `UPDATE "collection"
        SET meta_data = jsonb_set(
              meta_data,
              ARRAY[$2],
              COALESCE(meta_data -> $2, '{}'::jsonb) || jsonb_build_object($3, $4::jsonb),
              true)
      WHERE collection_id = $1`,
    [collectionId, namespace, key, JSON.stringify(validated)]
  );
}
