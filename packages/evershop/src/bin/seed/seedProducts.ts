import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { insert, select } from '@evershop/postgres-query-builder';
import { info, success, error, warning } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import createProduct from '../../modules/catalog/services/product/createProduct.js';
import { seedProductImages } from './seedImages.js';
import {
  createVariantGroups,
  resolveAttributeOptions
} from './variantGroupHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed products from JSON file
 */
export async function seedProducts(
  demoAttributeGroupId: number
): Promise<void> {
  info('Seeding products...');
  const dataPath = path.join(__dirname, 'data', 'products.json');
  const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Get color and size attribute IDs
  const colorAttribute = await select()
    .from('attribute')
    .where('attribute_code', '=', 'color')
    .load(pool);

  const sizeAttribute = await select()
    .from('attribute')
    .where('attribute_code', '=', 'size')
    .load(pool);

  if (!colorAttribute || !sizeAttribute) {
    error(
      'Color and Size attributes must be seeded first. Run: npm run seed -- --attributes'
    );
    return;
  }

  // Create variant groups
  const variantGroupIds = await createVariantGroups(
    productsData,
    demoAttributeGroupId,
    colorAttribute.attribute_id
  );

  // Seed products
  info('\nSeeding products...');
  for (const productData of productsData) {
    try {
      // Check if product already exists
      const existingProduct = await select()
        .from('product')
        .where('sku', '=', productData.sku)
        .load(pool);

      if (existingProduct) {
        info(
          `Product "${productData.name}" (${productData.sku}) already exists, skipping...`
        );
        continue;
      }

      // Assign product to the demo attribute group
      if (!productData.group_id) {
        if (!demoAttributeGroupId) {
          error('Demo attribute group ID is not set. This should not happen.');
          continue;
        }
        productData.group_id = demoAttributeGroupId;
      }

      // Resolve category_id from the category field
      if (productData.category) {
        const categoryUrlKey = productData.category;
        const categoryQuery = select('category.category_id').from(
          'category_description'
        );
        categoryQuery
          .leftJoin('category')
          .on(
            'category.category_id',
            '=',
            'category_description.category_description_category_id'
          );

        categoryQuery.where(
          'category_description.url_key',
          '=',
          categoryUrlKey
        );

        const category = await categoryQuery.load(pool);

        if (category && category.category_id) {
          productData.category_id = category.category_id;
        } else {
          warning(
            `  ⚠️  Category "${categoryUrlKey}" not found, product will have no category`
          );
        }

        // Remove category field as it's not needed for product creation
        delete productData.category;
      }

      // Save collections, images, and variant_group for later processing
      const collections = productData.collections;
      const images = productData.images;
      const variantGroup = productData.variant_group;
      delete productData.collections;
      delete productData.images;
      delete productData.variant_group;

      // Set variant_group_id if this product belongs to a variant group
      if (variantGroup && variantGroupIds.has(variantGroup)) {
        productData.variant_group_id = variantGroupIds.get(variantGroup);
        info(
          `  → Assigning to variant group: ${variantGroup} (ID: ${productData.variant_group_id})`
        );
      }

      // Convert attribute values to option IDs for select type attributes
      if (productData.attributes && Array.isArray(productData.attributes)) {
        productData.attributes = await resolveAttributeOptions(
          productData.attributes
        );
      }

      const product = await createProduct(productData, {});
      success(`✓ Created product: ${productData.name} (${productData.sku})`);

      // Process images
      if (images && Array.isArray(images)) {
        await seedProductImages(product.insertId, images);
      }

      // Assign product to collections if specified
      if (collections && Array.isArray(collections)) {
        for (const collectionCode of collections) {
          const collection = await select()
            .from('collection')
            .where('code', '=', collectionCode)
            .load(pool);

          if (collection) {
            await insert('product_collection')
              .given({
                collection_id: collection.collection_id,
                product_id: product.insertId
              })
              .execute(pool);
            info(`  → Assigned to collection: ${collectionCode}`);
          }
        }
      }
    } catch (e: any) {
      error(`Failed to create product ${productData.name}: ${e.message}`);
    }
  }
}
