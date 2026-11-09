import type { PoolClient } from 'pg';
import { addUpdatedAtTrigger } from '../../../lib/postgres/updatedAtTrigger.js';

/**
 * Keep `updated_at` current on the blog tables. No code set it, so it stayed
 * at the creation time, and what reads it (the sitemap's <lastmod>, the API,
 * webhook payloads) never saw a change. See lib/postgres/updatedAtTrigger.ts.
 */
export default async (connection: PoolClient) => {
  for (const table of ['blog_category', 'blog_post']) {
    await addUpdatedAtTrigger(connection, table);
  }
};
