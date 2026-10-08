import path from 'path';
import { fileURLToPath } from 'url';
import { select } from '@evershop/postgres-query-builder';
import { info, success, error, warning } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import createCategory from '../../modules/catalog/services/category/createCategory.js';
import updateCategory from '../../modules/catalog/services/category/updateCategory.js';
import { uploadThemeSeedImage } from './seedImages.js';
import { reportSeedSource, resolveSeedData } from './themeSeedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ExistingCategory {
  uuid: string;
  categoryId: number;
  image: string | null;
}

/** The category owning `url_key`, or null. */
async function findCategoryByUrlKey(
  urlKey: string
): Promise<ExistingCategory | null> {
  const query = select('category.uuid')
    .from('category_description')
    .select('category.category_id')
    .select('category_description.image');
  query
    .leftJoin('category')
    .on(
      'category.category_id',
      '=',
      'category_description.category_description_category_id'
    );
  const row = (await query.where('url_key', '=', urlKey).load(pool)) as any;
  return row
    ? { uuid: row.uuid, categoryId: row.category_id, image: row.image ?? null }
    : null;
}

/**
 * True when the category already holds this exact photo.
 *
 * The stored value is the uploaded path (`/assets/catalog/1234/5678/cat-women.jpg`)
 * and the seed data names the source file (`demo/cat-women.jpg`), so the
 * filename is the only thing the two share. Without this check a re-seed
 * uploaded the same four photos again under a fresh random path and left the
 * previous copies on disk, unreferenced, on every run.
 */
function alreadyHasImage(stored: string | null, source?: string): boolean {
  if (!stored || !source) {
    return false;
  }
  const name = (p: string) => p.split('/').pop();
  return name(stored) === name(source);
}

/**
 * Seed categories from JSON file.
 *
 * Existing categories are UPDATED, not skipped. The install migration already
 * creates Women, Men and Kids with a one-word description and no image, so a
 * theme that ships those url_keys could never apply its own copy or photos —
 * the seeder skipped all three and the demo looked half-finished.
 */
export async function seedCategories(): Promise<void> {
  info('Seeding categories...');
  const { data: categoriesData, source } = resolveSeedData<any[]>(
    'categories',
    path.join(__dirname, 'data')
  );
  reportSeedSource('categories', source);

  for (const categoryData of categoriesData) {
    try {
      const existing = await findCategoryByUrlKey(categoryData.url_key);

      // A theme's data can nest its catalogue by naming the parent's url_key.
      // Parents are declared before their children in the file, so one pass is
      // enough.
      if (categoryData.parent) {
        const parent = await findCategoryByUrlKey(categoryData.parent);
        if (parent) {
          categoryData.parent_id = parent.categoryId;
        } else {
          warning(
            `  ⚠️  Parent category "${categoryData.parent}" not found, "${categoryData.name}" stays a root category`
          );
        }
        delete categoryData.parent;
      }

      // A theme ships its category photos in its own `public/` folder and names
      // them relatively. Put them into the store's file storage so the stored
      // path is one the storefront can actually serve — but only once: a
      // re-seed keeps the photo it already uploaded.
      if (alreadyHasImage(existing?.image ?? null, categoryData.image)) {
        categoryData.image = existing!.image as string;
      } else {
        const uploaded = await uploadThemeSeedImage(
          categoryData.image,
          'catalog'
        );
        if (uploaded) {
          categoryData.image = uploaded;
          info(`  → Category image: ${uploaded}`);
        }
      }

      if (existing) {
        await updateCategory(existing.uuid, categoryData, {});
        success(`✓ Updated category: ${categoryData.name}`);
      } else if (Number(categoryData.status) === 0) {
        // A RETIREMENT entry, not a category. Themes ship `status: 0` rows to
        // switch off categories an older install created (Women, Men, Kids).
        // On a store that never had them there is nothing to retire — and
        // creating one would add the very category the entry means to remove,
        // which is exactly what a clean install was getting.
        info(
          `  → Skipped "${categoryData.name}": retirement entry, category not present`
        );
      } else {
        await createCategory(categoryData, {});
        success(`✓ Created category: ${categoryData.name}`);
      }
    } catch (e: any) {
      error(`Failed to seed category ${categoryData.name}: ${e.message}`);
    }
  }
}
