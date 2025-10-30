import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { select } from '@evershop/postgres-query-builder';
import { info, success, error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import createCollection from '../../modules/catalog/services/collection/createCollection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed collections from JSON file
 */
export async function seedCollections(): Promise<void> {
  info('Seeding collections...');
  const dataPath = path.join(__dirname, 'data', 'collections.json');
  const collectionsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  for (const collectionData of collectionsData) {
    try {
      // Check if collection already exists
      const existingCollection = await select()
        .from('collection')
        .where('code', '=', collectionData.code)
        .load(pool);

      if (existingCollection) {
        info(`Collection "${collectionData.name}" already exists, skipping...`);
        continue;
      }

      await createCollection(collectionData, {});
      success(`✓ Created collection: ${collectionData.name}`);
    } catch (e: any) {
      error(`Failed to create collection ${collectionData.name}: ${e.message}`);
    }
  }
}
