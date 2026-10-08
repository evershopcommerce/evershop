import { readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { insert, select } from '@evershop/postgres-query-builder';
import { info, success, warning, error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { uploadFile } from '../../modules/cms/services/uploadFile.js';
import { ensureRoutesLoaded } from '../lib/ensureRoutesLoaded.js';
import { downloadImage, getFilenameFromUrl } from './imageDownloader.js';
import { resolveSeedImage } from './themeSeedData.js';

const mimetypeFor = (filename: string): string => {
  const name = filename.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  if (name.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
};

/** A random two-level folder, so a re-seed doesn't overwrite the last one. */
const randomSubPath = (prefix: string): string =>
  `${prefix}/${Math.floor(Math.random() * (9999 - 1000)) + 1000}/${
    Math.floor(Math.random() * (9999 - 1000)) + 1000
  }`;

/**
 * Put a file the active theme ships in its `public/` folder into the store's
 * file storage and return its public URL.
 *
 * A theme's seed data names its own photos relatively (`demo/blog-1.jpg`), so
 * seeding works offline and the demo content matches the demo theme. Only
 * product images went through the storage provider; a category image or a blog
 * thumbnail was written to the database verbatim and 404'd on the storefront.
 *
 * Returns null when the reference is not a readable theme file — an absolute
 * URL keeps its existing behaviour (hot-linked for blog/category data,
 * downloaded for product images), so core's own seed data is unaffected.
 */
export async function uploadThemeSeedImage(
  url: string | undefined | null,
  pathPrefix: string
): Promise<string | null> {
  const localFile = url ? resolveSeedImage(url) : null;
  if (!localFile) {
    return null;
  }
  // The LOCAL storage provider builds a file's public URL from the
  // `staticAsset` route, and a CLI has not loaded the route registry — without
  // this, seeding a local-storage store dies on the first image with
  // `Route staticAsset is not existed` (FINDINGS #28).
  ensureRoutesLoaded();

  const filename = localFile.split('/').pop() as string;
  const buffer = await readFile(localFile);
  const [uploaded] = await uploadFile(
    [
      {
        filename,
        buffer,
        mimetype: mimetypeFor(filename),
        size: buffer.length
      } as Express.Multer.File
    ],
    randomSubPath(pathPrefix)
  );
  return uploaded.url;
}

/**
 * Seed product images: theme-local files are read from disk, everything else is
 * downloaded, and both are handed to the configured storage provider.
 */
export async function seedProductImages(
  productId: number,
  images: any[]
): Promise<void> {
  if (!images || images.length === 0) return;
  ensureRoutesLoaded();

  for (let i = 0; i < images.length; i++) {
    const imageData = images[i];
    try {
      let finalImageUrl = imageData.url;

      const localFile = resolveSeedImage(imageData.url);
      if (localFile || (imageData.url && imageData.url.startsWith('http'))) {
        info(
          localFile
            ? `  → Theme image: ${imageData.url}`
            : `  → Downloading image: ${imageData.url}`
        );

        const filename = localFile
          ? (localFile.split('/').pop() as string)
          : getFilenameFromUrl(imageData.url);

        // Destination path - organize by SKU
        const subPath = randomSubPath('catalog');

        // Download to a temp file, then hand the bytes to the configured
        // storage provider (local, S3, Azure, GCS). Writing straight into
        // media/ bypassed the provider: on cloud-storage stores the seeded
        // images landed on the ephemeral pod filesystem while every admin
        // upload went to the bucket.
        const tempPath = join(tmpdir(), `seed-${Date.now()}-${filename}`);

        try {
          if (!localFile) {
            await downloadImage(imageData.url, tempPath);
          }
          const buffer = await readFile(localFile ?? tempPath);
          const [uploaded] = await uploadFile(
            [
              {
                filename,
                buffer,
                mimetype: mimetypeFor(filename),
                size: buffer.length
              } as Express.Multer.File
            ],
            subPath
          );
          await rm(tempPath, { force: true });

          finalImageUrl = uploaded.url;
          success(`  ✓ Stored via file storage provider: ${finalImageUrl}`);
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
