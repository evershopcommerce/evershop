import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When a shop metafield definition is deleted, strip its key from the
 * `metafield_shop` singleton's `meta_data`. Idempotent (`#-` on a missing path
 * is a no-op).
 */
export default async function pruneShop(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'shop') return;
  await pool.query(
    `UPDATE "metafield_shop" SET meta_data = meta_data #- ARRAY[$1::text, $2::text] WHERE id = true`,
    [data.namespace, data.fieldKey]
  );
}
