import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insert, select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../lib/helpers.js';
import { error, info, success } from '../../lib/log/logger.js';
import { getConnection } from '../../lib/postgres/connection.js';
import {
  downloadImage,
  getFilenameFromUrl,
  convertToMediaPath
} from './imageDownloader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WidgetData {
  name: string;
  type: string;
  status: 1 | 0;
  area: string;
  route: string[];
  settings: Record<string, any>;
  sort_order: number;
}

interface SlideData {
  id: string;
  image: string;
  width: number;
  height: number;
  headline?: string;
  subheadline?: string;
  buttonText?: string;
  buttonUrl?: string;
}

/**
 * Download slideshow images and update URLs
 */
async function downloadSlideshowImages(
  settings: Record<string, any>
): Promise<Record<string, any>> {
  if (settings.slides && Array.isArray(settings.slides)) {
    const updatedSlides: SlideData[] = [];

    for (const slide of settings.slides as SlideData[]) {
      if (slide.image && slide.image.startsWith('http')) {
        try {
          info(`  → Downloading slide image: ${slide.image}`);

          // Get filename from URL
          const filename = getFilenameFromUrl(slide.image);
          const slideId = slide.id || `slide-${Date.now()}`;

          // Create local path
          const mediaDir = join(
            CONSTANTS.ROOTPATH,
            'media',
            'widgets',
            slideId
          );

          // Ensure directory exists
          if (!existsSync(mediaDir)) {
            mkdirSync(mediaDir, { recursive: true });
          }

          const localPath = join(mediaDir, filename);

          // Download image
          await downloadImage(slide.image, localPath);

          // Convert to media URL
          const mediaUrl = convertToMediaPath(localPath);

          // Update slide with local URL
          updatedSlides.push({
            ...slide,
            image: mediaUrl
          });
        } catch (err) {
          error(`  ✗ Failed to download slide image: ${err}`);
          // Keep original URL on failure
          updatedSlides.push(slide);
        }
      } else {
        updatedSlides.push(slide);
      }
    }

    return {
      ...settings,
      slides: updatedSlides
    };
  }

  return settings;
}

/**
 * Seed widgets from JSON file
 */
export async function seedWidgets(): Promise<void> {
  try {
    info('Seeding widgets...');

    // Read widgets data
    const widgetsPath = join(__dirname, 'data', 'widgets.json');
    const widgetsData: WidgetData[] = JSON.parse(
      readFileSync(widgetsPath, 'utf-8')
    );

    const connection = await getConnection();
    let created = 0;
    let skipped = 0;

    for (const widgetData of widgetsData) {
      // Check if widget already exists (by name and type)
      const existing = await select()
        .from('widget')
        .where('name', '=', widgetData.name)
        .and('type', '=', widgetData.type)
        .load(connection, false);

      if (existing) {
        info(`  ⊘ Widget "${widgetData.name}" already exists, skipping...`);
        skipped++;
        continue;
      }

      // Process settings - download slideshow images if needed
      let processedSettings = widgetData.settings;
      if (widgetData.type === 'simple_slider') {
        info(`  → Processing slideshow images for: ${widgetData.name}`);
        processedSettings = await downloadSlideshowImages(widgetData.settings);
      }

      // Insert widget
      await insert('widget')
        .given({
          name: widgetData.name,
          type: widgetData.type,
          area: widgetData.area,
          route: JSON.stringify(widgetData.route),
          sort_order: widgetData.sort_order,
          settings: JSON.stringify(processedSettings),
          status: widgetData.status
        })
        .execute(connection, false);

      success(`  ✓ Created widget: ${widgetData.name}`);
      created++;
    }

    success(
      `✓ Widget seeding complete: ${created} created, ${skipped} skipped`
    );
  } catch (e: any) {
    error(`Failed to seed widgets: ${e.message}`);
    throw e;
  }
}
