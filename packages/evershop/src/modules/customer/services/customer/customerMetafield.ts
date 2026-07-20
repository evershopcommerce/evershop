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
import { buildMetaDataUpdate } from '../../../../lib/metafield/metaDataSql.js';
import { pool } from '../../../../lib/postgres/connection.js';

const OWNER = 'customer';

/** Create a customer metafield definition (the core service with the owner baked in). */
export function addCustomerMetafieldDefinition(
  input: Omit<CreateDefinitionInput, 'ownerType'>
) {
  return createMetafieldDefinition({ ...input, ownerType: OWNER });
}

/**
 * Set the full metafield value set for a customer. Validates against the customer
 * definitions and writes `meta_data` wholesale.
 */
export async function setCustomerMetafields(
  customerId: number,
  values: MetaData,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const metaData = await validateMetafields(OWNER, values);
  await update('customer')
    .given({ meta_data: metaData })
    .where('customer_id', '=', customerId)
    .execute(connection);
}

/**
 * Set a single customer metafield without touching the others (out-of-band path).
 * Targeted `jsonb_set` merge that creates the
 * namespace object if missing; a blank value removes the key instead of
 * storing a JSON null.
 */
export async function setCustomerMetafield(
  customerId: number,
  namespace: string,
  key: string,
  value: unknown,
  connection: Pool | PoolClient = pool
): Promise<void> {
  const validated = await validateMetafield(OWNER, namespace, key, value);
  const { sql, params } = buildMetaDataUpdate({
    table: 'customer',
    whereClause: 'customer_id = $1',
    idParams: [customerId],
    namespace,
    key,
    validated
  });
  await connection.query(sql, params);
}
