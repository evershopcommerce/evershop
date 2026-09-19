import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When an order metafield definition is deleted, strip its key from every
 * order's `meta_data`. Idempotent (`#-` on a missing path is a no-op).
 */
export default async function pruneOrder(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'order') return;
  await pool.query(
    `UPDATE "order" SET meta_data = meta_data #- ARRAY[$1::text, $2::text]`,
    [data.namespace, data.fieldKey]
  );
}
