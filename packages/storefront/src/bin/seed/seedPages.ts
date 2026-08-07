import { readFileSync } from 'fs';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { insert, select } from '@storefront/postgres-query-builder';
import { CONSTANTS } from '../../lib/helpers.js';
import { error, info, success } from '../../lib/log/logger.js';
import { getConnection } from '../../lib/postgres/connection.js';
import {
  convertToMediaPath,
  downloadImage,
  getFilenameFromUrl
} from './imageDownloader.js';

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
 * Walk the editor content of a page and import any referenced image into the
 * media folder, rewriting the block to point at the local asset URL.
 */
async function importPageImages(content: any[]): Promise<any[]> {
  for (const row of content || []) {
    for (const column of row?.columns || []) {
      for (const block of column?.data?.blocks || []) {
        const url = block?.data?.file?.url;
        if (!url || url.startsWith('/assets/')) {
          continue;
        }
        try {
          info(`  → Importing page image: ${url}`);
          const filename = getFilenameFromUrl(url);
          const localPath = join(
            CONSTANTS.ROOTPATH,
            'media',
            'pages',
            filename
          );
          await downloadImage(url, localPath);
          block.data.file.url = convertToMediaPath(localPath);
        } catch (e: any) {
          error(`  ✗ Failed to import page image: ${e.message}`);
        }
      }
    }
  }
  return content;
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

      // Import any images referenced by the page content
      const content = await importPageImages(pageData.content);

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
          content: JSON.stringify(content),
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
