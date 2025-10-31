import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { insert, select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../lib/helpers.js';
import { info, success, warning, error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { downloadImage, getFilenameFromUrl } from './imageDownloader.js';

/**
 * Seed product images by downloading from GitHub raw URLs
 */
export async function seedProductImages(
  productId: number,
  images: any[]
): Promise<void> {
  if (!images || images.length === 0) return;

  for (let i = 0; i < images.length; i++) {
    const imageData = images[i];
    try {
      let finalImageUrl = imageData.url;

      // Download image if it's a remote URL
      if (imageData.url && imageData.url.startsWith('http')) {
        info(`  → Downloading image: ${imageData.url}`);

        // Get filename from URL
        const filename = getFilenameFromUrl(imageData.url);

        // Create local path - organize by SKU
        const subPath = `catalog/${
          Math.floor(Math.random() * (9999 - 1000)) + 1000
        }/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`;
        const mediaDir = join(CONSTANTS.ROOTPATH, 'media', subPath);

        // Ensure directory exists
        if (!existsSync(mediaDir)) {
          mkdirSync(mediaDir, { recursive: true });
        }

        const localPath = join(mediaDir, filename);

        try {
          // Download image
          await downloadImage(imageData.url, localPath);

          // Convert to media URL
          finalImageUrl = `/assets/${subPath}/${filename}`;
          success(`  ✓ Downloaded and saved: ${mediaDir}`);
          // Check if image record already exists
          const existingImage = await select()
            .from('product_image')
            .where('product_image_product_id', '=', productId)
            .and('origin_image', '=', finalImageUrl)
            .load(pool);

          if (!existingImage) {
            // Save image URL to database
            await insert('product_image')
              .given({
                product_image_product_id: productId,
                origin_image: finalImageUrl,
                is_main: imageData.isMain ? 1 : 0
              })
              .execute(pool);
            info(`  ✓ Added image record to database`);
          } else {
            info(`  → Image already exists in database`);
          }
        } catch (downloadErr: any) {
          error(`  ✗ Failed to download image: ${downloadErr.message}`);
        }
      }
    } catch (e: any) {
      warning(`  ⚠️  Failed to process image ${i + 1}: ${e.message}`);
    }
  }
}
