import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When a collection metafield definition is deleted, strip its key from every
 * collection's `meta_data`. Idempotent (`#-` on a missing path is a no-op).
 */
export default async function pruneCollection(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'collection') return;
  await pool.query(
    `UPDATE "collection" SET meta_data = meta_data #- ARRAY[$1::text, $2::text]`,
    [data.namespace, data.fieldKey]
  );
}
