import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When a blog-category metafield definition is deleted, strip its key from
 * every category's `meta_data`. Idempotent (`#-` on a missing path is a no-op).
 */
export default async function pruneBlogCategory(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'blog_category') return;
  await pool.query(
    `UPDATE "blog_category" SET meta_data = meta_data #- ARRAY[$1::text, $2::text]`,
    [data.namespace, data.fieldKey]
  );
}
