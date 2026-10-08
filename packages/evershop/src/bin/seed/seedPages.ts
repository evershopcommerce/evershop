import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { error, info, success } from '../../lib/log/logger.js';
import { getConnection, pool } from '../../lib/postgres/connection.js';
import { reportSeedSource, resolveSeedData } from './themeSeedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PageData {
  status: boolean;
  url_key: string;
  name: string;
  content: any[];
  meta_title: string;
  meta_keywords?: string;
  meta_description?: string;
}

/**
 * Seed CMS pages from JSON file.
 *
 * Each page is its own transaction: `cms_page` and `cms_page_description` have
 * to land together, and a page that fails must not stop the ones after it.
 *
 * The existence check runs on the shared pool, NOT on the transaction's
 * PoolClient. A read on a freshly acquired client before `startTransaction`
 * releases it back to the pool, and the transaction then runs on a detached
 * client — which is how this seeder used to die on the second page with
 * "Release called on client which has already been released to the pool".
 * Core's own data has a single page, so nothing ever caught it.
 */
export async function seedPages(): Promise<void> {
  info('Seeding CMS pages...');

  const { data: pagesData, source } = resolveSeedData<PageData[]>(
    'pages',
    join(__dirname, 'data')
  );
  reportSeedSource('pages', source);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const pageData of pagesData) {
    const existing = await select()
      .from('cms_page_description')
      .where('url_key', '=', pageData.url_key)
      .load(pool);

    if (existing) {
      info(`  ⊘ Page "${pageData.url_key}" already exists, skipping...`);
      skipped++;
      continue;
    }

    const connection = await getConnection();
    await startTransaction(connection);
    try {
      const page = await insert('cms_page')
        .given({ status: pageData.status })
        .execute(connection, false);

      await insert('cms_page_description')
        .given({
          cms_page_description_cms_page_id: page.cms_page_id,
          url_key: pageData.url_key,
          name: pageData.name,
          content: JSON.stringify(pageData.content),
          meta_title: pageData.meta_title,
          meta_keywords: pageData.meta_keywords || null,
          meta_description: pageData.meta_description || null
        })
        .execute(connection, false);

      await commit(connection);
      success(`  ✓ Created page: ${pageData.name} (/${pageData.url_key})`);
      created++;
    } catch (e: any) {
      await rollback(connection);
      error(`  ✗ Failed to create page "${pageData.url_key}": ${e.message}`);
      failed++;
    }
  }

  success(
    `✓ CMS pages seeding complete: ${created} created, ${skipped} skipped` +
      (failed ? `, ${failed} failed` : '')
  );
}
