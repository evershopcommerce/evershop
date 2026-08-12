import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When a category metafield definition is deleted, strip its key from every
 * category's `meta_data`. Idempotent (`#-` on a missing path is a no-op).
 */
export default async function pruneCategory(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'category') return;
  await pool.query(
    `UPDATE "category" SET meta_data = meta_data #- ARRAY[$1::text, $2::text]`,
    [data.namespace, data.fieldKey]
  );
}
