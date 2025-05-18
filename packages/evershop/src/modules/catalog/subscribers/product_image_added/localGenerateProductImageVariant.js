import { existsSync } from 'fs';
import path from 'path';
import { update } from '@evershop/postgres-query-builder';
import sharp from 'sharp';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';

export default async function localGenerateProductImageVariant(data) {
  if (getConfig('system.file_storage') === 'local') {
    try {
      const imagePath = data.origin_image.replace('/assets', '');
      const mediaPath = path.join(CONSTANTS.MEDIAPATH, imagePath);
      const ext = path.extname(path.resolve(CONSTANTS.MEDIAPATH, imagePath));
      const singlePath = imagePath.replace(ext, `-single${ext}`);
      const listingPath = imagePath.replace(ext, `-listing${ext}`);
      const thumbnailPath = imagePath.replace(ext, `-thumb${ext}`);
      if (existsSync(mediaPath)) {
        // Generate thumbnail
        await sharp(mediaPath)
          .resize(
            getConfig('catalog.product.image.thumbnail.width', 100),
            getConfig('catalog.product.image.thumbnail.height', 100),
            { fit: 'inside' }
          )
          .toFile(path.join(CONSTANTS.MEDIAPATH, thumbnailPath));

        // Generate listing
        await sharp(mediaPath)
          .resize(
            getConfig('catalog.product.image.listing.width', 250),
            getConfig('catalog.product.image.listing.height', 250),
            { fit: 'inside' }
          )
          .toFile(path.join(CONSTANTS.MEDIAPATH, listingPath));

        // Generate single
        await sharp(mediaPath)
          .resize(
            getConfig('catalog.product.image.single.width', 500),
            getConfig('catalog.product.image.single.height', 500),
            { fit: 'inside' }
          )
          .toFile(path.join(CONSTANTS.MEDIAPATH, singlePath));
      }

      // Update the record in the database with the new URLs in the variant columns
      await update('product_image')
        .given({
          single_image: `/assets${singlePath}`,
          listing_image: `/assets${listingPath}`,
          thumb_image: `/assets${thumbnailPath}`
        })
        .where('product_image_product_id', '=', data.product_image_product_id)
        .and('origin_image', '=', data.origin_image)
        .execute(pool);
    } catch (e) {
      error(e);
    }
  }
}
