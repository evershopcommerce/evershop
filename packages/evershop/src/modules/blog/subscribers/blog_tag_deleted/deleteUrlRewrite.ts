import { del } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

/** Remove the blog tag's url_rewrite row on delete. */
export default async (data: { uuid: string }): Promise<void> => {
  try {
    await del('url_rewrite')
      .where('entity_uuid', '=', data.uuid)
      .and('entity_type', '=', 'blog_tag')
      .execute(pool);
  } catch (e) {
    error(e);
  }
};
