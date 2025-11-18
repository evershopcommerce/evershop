import { readFileSync } from 'fs';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { insert, select } from '@evershop/postgres-query-builder';
import { error, info, success } from '../../lib/log/logger.js';
import { getConnection } from '../../lib/postgres/connection.js';

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
 * Seed CMS pages from JSON file
 */
export async function seedPages(): Promise<void> {
  try {
    info('Seeding CMS pages...');

    // Read pages data
    const pagesPath = join(__dirname, 'data', 'pages.json');
    const pagesData: PageData[] = JSON.parse(readFileSync(pagesPath, 'utf-8'));

    const connection = await getConnection();
    let created = 0;
    let skipped = 0;

    for (const pageData of pagesData) {
      // Check if page already exists (by url_key)
      const existing = await select()
        .from('cms_page_description')
        .where('url_key', '=', pageData.url_key)
        .load(connection, false);

      if (existing) {
        info(`  ⊘ Page "${pageData.url_key}" already exists, skipping...`);
        skipped++;
        continue;
      }

      // Insert cms_page first
      const page = await insert('cms_page')
        .given({
          status: pageData.status
        })
        .execute(connection, false);

      // Insert cms_page_description
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
        .execute(connection);

      success(`  ✓ Created page: ${pageData.name} (/${pageData.url_key})`);
      created++;
    }

    success(
      `✓ CMS pages seeding complete: ${created} created, ${skipped} skipped`
    );
  } catch (e: any) {
    error(`Failed to seed pages: ${e.message}`);
    throw e;
  }
}
