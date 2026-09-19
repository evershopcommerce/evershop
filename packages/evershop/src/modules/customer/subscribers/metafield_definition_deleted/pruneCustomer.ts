import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When a customer metafield definition is deleted, strip its key from every
 * customer's `meta_data`. Idempotent (`#-` on a missing path is a no-op).
 */
export default async function pruneCustomer(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'customer') return;
  await pool.query(
    `UPDATE "customer" SET meta_data = meta_data #- ARRAY[$1::text, $2::text]`,
    [data.namespace, data.fieldKey]
  );
}
