import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When a product metafield definition is deleted, strip its key from every
 * product's `meta_data`. Idempotent (`#-` on a missing path is a no-op).
 */
export default async function pruneProduct(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'product') return;
  await pool.query(
    `UPDATE "product" SET meta_data = meta_data #- ARRAY[$1::text, $2::text]`,
    [data.namespace, data.fieldKey]
  );
}
