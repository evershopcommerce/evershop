import { insertOnUpdate } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

/** Re-upsert `/blog/tag/{url_key}` → `/blogTag/{uuid}` on update. */
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
        entity_type: 'blog_tag',
        entity_uuid: data.uuid,
        request_path: `/blog/tag/${data.url_key}`,
        target_path: `/blogTag/${data.uuid}`
      })
      .execute(pool);
  } catch (e) {
    error(e);
  }
};
