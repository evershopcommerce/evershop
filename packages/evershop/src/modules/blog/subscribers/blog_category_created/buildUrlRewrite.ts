import { insertOnUpdate } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

/** Build `/blog/category/{url_key}` → `/blogCategory/{uuid}` on create. */
export default async (data: {
  uuid: string;
  url_key?: string;
}): Promise<void> => {
  try {
    if (!data?.url_key) {
      return;
    }
    await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
      .given({
        entity_type: 'blog_category',
        entity_uuid: data.uuid,
        request_path: `/blog/category/${data.url_key}`,
        target_path: `/blogCategory/${data.uuid}`
      })
      .execute(pool);
  } catch (e) {
    error(e);
  }
};
