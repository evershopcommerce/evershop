import { createWriteStream, existsSync, mkdirSync } from 'fs';
import http from 'http';
import https from 'https';
import { dirname } from 'path';
import { pipeline } from 'stream/promises';
import { info, warning } from '../../lib/log/logger.js';

/**
 * Download an image from a URL and save it to a local file
 */
export async function downloadImage(
  url: string,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Ensure directory exists
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, (response) => {
      // Handle redirects
      if (
        response.statusCode === 301 ||
        response.statusCode === 302 ||
        response.statusCode === 307 ||
        response.statusCode === 308
      ) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          info(`  → Following redirect to: ${redirectUrl}`);
          downloadImage(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(
          new Error(`Failed to download: HTTP ${response.statusCode} - ${url}`)
        );
        return;
      }

      const fileStream = createWriteStream(outputPath);

      pipeline(response, fileStream)
        .then(() => {
          info(`  ✓ Downloaded: ${url} → ${outputPath}`);
          resolve(outputPath);
        })
        .catch((err) => {
          reject(new Error(`Failed to save file: ${err.message}`));
        });
    });

    request.on('error', (err) => {
      reject(new Error(`Download failed: ${err.message}`));
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Generate a filename from URL
 */
export function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // For Unsplash images, extract photo ID
    if (urlObj.hostname.includes('unsplash.com')) {
      const photoId = urlObj.pathname.split('/').pop() || 'image';
      return `${photoId}.jpg`;
    }

    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'image.jpg';

    // Ensure it has an extension
    if (!filename.includes('.')) {
      return `${filename}.jpg`;
    }

    return filename;
  } catch {
    return `image-${Date.now()}.jpg`;
  }
}

/**
 * Convert GitHub raw URL to a local media path
 */
export function convertToMediaPath(localPath: string): string {
  // Convert absolute path to relative media path
  // e.g., /path/to/media/widgets/slide-1.jpg -> /assets/widgets/slide-1.jpg
  // or on Windows: C:\path\to\media\widgets\slide-1.jpg -> /assets/widgets/slide-1.jpg

  // Normalize to forward slashes for consistent matching
  const normalizedPath = localPath.replace(/\\/g, '/');

  const mediaMatch = normalizedPath.match(/media\/(.+)$/);
  if (mediaMatch) {
    return `/assets/${mediaMatch[1]}`;
  }
  return localPath;
}
