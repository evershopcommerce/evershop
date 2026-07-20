import { pool } from '../../../../lib/postgres/connection.js';

/**
 * When a blog-post metafield definition is deleted, strip its key from every
 * post's `meta_data`. Idempotent (`#-` on a missing path is a no-op).
 */
export default async function pruneBlogPost(data: {
  ownerType: string;
  namespace: string;
  fieldKey: string;
}): Promise<void> {
  if (data.ownerType !== 'blog_post') return;
  await pool.query(
    `UPDATE "blog_post" SET meta_data = meta_data #- ARRAY[$1::text, $2::text]`,
    [data.namespace, data.fieldKey]
  );
}
