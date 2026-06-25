import { insertOnUpdate } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

/**
 * Build the SEO url_rewrite row for a blog post on create.
 * Pretty `/blog/{url_key}` → internal `/blogPost/{uuid}`.
 */
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
        entity_type: 'blog_post',
        entity_uuid: data.uuid,
        request_path: `/blog/${data.url_key}`,
        target_path: `/blogPost/${data.uuid}`
      })
      .execute(pool);
  } catch (e) {
    error(e);
  }
};
