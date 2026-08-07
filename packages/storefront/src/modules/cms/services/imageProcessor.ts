import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { CONSTANTS } from '../../../lib/helpers.js';
import { debug } from '../../../lib/log/logger.js';

const hasTransparency = async (imageBuffer: Buffer): Promise<boolean> => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return (
      metadata.channels === 4 ||
      metadata.format === 'png' ||
      metadata.format === 'svg'
    );
  } catch {
    return false;
  }
};

const isSvg = async (imageBuffer: Buffer): Promise<boolean> => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return metadata.format === 'svg';
  } catch {
    return false;
  }
};

// We'll handle SVG detection and transparency checks directly in the imageProcessor function
// Generate cache key using encoded src (works for both internal and external)
const generateCacheKey = (
  src: string,
  width: number,
  quality: number,
  format: string,
  height?: number,
  allowUpscale: boolean = false
) => {
  // Use base64 encoding to safely handle both internal paths and external URLs
  const encodedSrc = Buffer.from(src).toString('base64url'); // URL-safe base64
  const heightPart = height ? `-${height}h` : '';
  const upscalePart = allowUpscale ? '-up' : '';
  return `${encodedSrc}-${width}w${heightPart}${upscalePart}-${quality}q.${format}`;
};

interface ProcessedImage {
  buffer: Buffer;
  path: string;
  metadata: {
    format: string;
    width: number;
    height: number;
    contentType: string;
  };
}

export const imageProcessor = async (
  src: string,
  width: number,
  quality: number,
  format: 'jpeg' | 'png' | 'webp' | 'avif' = 'webp',
  height?: number,
  allowUpscale: boolean = false
): Promise<ProcessedImage> => {
  if (
    !src ||
    !width ||
    isNaN(width) ||
    (height !== undefined && isNaN(height))
  ) {
    throw new Error('Missing or invalid "src", "w", or "h" parameter');
  }

  // Enhanced security validation for src parameter
  const isExternalUrl = src.startsWith('http://') || src.startsWith('https://');

  if (!isExternalUrl) {
    // Special case: Handle assets path format like "/assets/media/image.png" or "/assets/image.png"
    if (src.startsWith('/assets/')) {
      // Extract the filename after '/assets/'
      const assetsPattern = /\/assets\/(.+)$|^assets\/(.+)$/;
      const matches = src.match(assetsPattern);

      if (matches) {
        const assetPath = matches[1] || matches[2]; // Use the matched group

        // Try multiple possible locations in order of priority
        const possiblePaths = [
          `media/${assetPath}`,
          `public/${assetPath}`
          // For themes, we need to check each theme's public directory
          // This is more complex and would require listing themes
        ];

        let fileExists = false;
        for (const possiblePath of possiblePaths) {
          try {
            // Check if the file exists in this location
            await fs.access(path.join(CONSTANTS.ROOTPATH, possiblePath));
            // If we get here, the file exists in this location
            src = possiblePath;
            debug(`[imageProcessor] Found asset at: ${src}`);
            fileExists = true;
            break;
          } catch {
            // File doesn't exist in this location, continue to next one
            continue;
          }
        }

        // If file wasn't found in any of the standard locations,
        // default to media directory and let the normal error handling take over
        if (!fileExists) {
          src = `media/${assetPath}`;
          debug(`[imageProcessor] Defaulting to media path: ${src}`);
        }
      }
    }

    // Now continue with regular path validation
    // Remove leading slash if present for consistent handling
    const normalized = path.normalize(src);
    const cleanPath = normalized.startsWith('/')
      ? normalized.substring(1)
      : normalized;

    // Normalize to forward slashes for consistent checking across platforms
    const normalizedPath = cleanPath.replace(/\\/g, '/');

    // Prevent directory traversal attacks
    if (normalizedPath.includes('..') || normalizedPath.includes('\0')) {
      throw new Error('Invalid characters in image path');
    }

    // Only allow specific directories from project root
    const allowedPaths = ['media/', 'public/', 'themes/'];

    const isAllowedPath = allowedPaths.some((allowedPath) => {
      if (allowedPath === 'themes/') {
        // Special handling for themes: must be themes/<themename>/public/
        const themePattern = /^themes\/[^\/]+\/public\//;
        return themePattern.test(normalizedPath);
      }
      return normalizedPath.startsWith(allowedPath);
    });

    if (!isAllowedPath) {
      throw new Error(
        'Image source must be from media/, public/, or themes/<themename>/public/ directories at project root'
      );
    }

    // Update src to use normalized path (keep it relative to project root)
    src = normalizedPath;
  }

  // Use the specified format directly
  const CACHE_DIR = path.resolve(CONSTANTS.BUILDPATH, '../images');

  // Ensure cache directory exists
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
  try {
    let sourceImageBuffer: Buffer;
    let cachedImageKey = generateCacheKey(
      src,
      width,
      quality,
      format,
      height,
      allowUpscale
    );

    if (isExternalUrl) {
      // Handle external URL
      const cachedImagePath = path.join(CACHE_DIR, cachedImageKey);

      // Check cache first for external images
      try {
        await fs.access(cachedImagePath);
        // Read the buffer and metadata for the cached file
        const buffer = await fs.readFile(cachedImagePath);
        const metadata = await sharp(buffer).metadata();

        return {
          buffer,
          path: cachedImagePath,
          metadata: {
            format: metadata.format || format,
            width: metadata.width || width,
            height: metadata.height || height || 0,
            contentType: `image/${metadata.format || format}`
          }
        };
      } catch {
        // Not in cache, fetch from external URL
      }

      // Fetch image from external URL
      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        sourceImageBuffer = Buffer.from(arrayBuffer);
      } catch (fetchError) {
        throw new Error(
          `Failed to fetch external image: ${fetchError.message}`
        );
      }
    } else {
      // Handle local file
      const cachedImagePath = path.join(CACHE_DIR, cachedImageKey);
      const sourcePath = path.join(CONSTANTS.ROOTPATH, src);
      try {
        await fs.access(cachedImagePath);
        // Read the buffer and metadata for the cached file
        const buffer = await fs.readFile(cachedImagePath);
        const metadata = await sharp(buffer).metadata();

        return {
          buffer,
          path: cachedImagePath,
          metadata: {
            format: metadata.format || format,
            width: metadata.width || width,
            height: metadata.height || height || 0,
            contentType: `image/${metadata.format || format}`
          }
        };
      } catch {
        // Not in cache, process the source image
      }

      try {
        await fs.access(sourcePath);
      } catch {
        throw new Error(`Image ${sourcePath} not found`);
      }

      // Read the image file
      sourceImageBuffer = await fs.readFile(sourcePath);
    }

    // Use the specified format directly
    // For SVG images, we might want to consider using PNG for better quality
    let finalFormat = format;

    // Check if the image is SVG and adjust format if needed
    if ((await isSvg(sourceImageBuffer)) && format === 'jpeg') {
      // SVGs with transparency should use PNG or WebP instead of JPEG
      finalFormat = 'png';
    }

    // Update cache key with the final format
    cachedImageKey = generateCacheKey(
      src,
      width,
      quality,
      finalFormat,
      height,
      allowUpscale
    );

    // Process image with Sharp (common for both internal and external)
    let sharpInstance;

    // Set up resize options
    const resizeOptions: sharp.ResizeOptions = {
      width: width,
      withoutEnlargement: !allowUpscale, // Don't upscale unless explicitly allowed
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background for padding
    };

    // Add height if specified
    if (height !== undefined) {
      resizeOptions.height = height;
      resizeOptions.fit = 'contain'; // Use contain to preserve aspect ratio
    }

    // Check if the image is SVG for special handling
    if (await isSvg(sourceImageBuffer)) {
      // Configure sharp for optimal SVG rendering
      sharpInstance = sharp(sourceImageBuffer, {
        // Higher density for SVG to raster conversion for better quality
        density: 300,
        // Don't limit input pixels for SVG to preserve vector quality
        limitInputPixels: false
      }).resize(resizeOptions);
    } else {
      // Standard handling for raster images
      sharpInstance = sharp(sourceImageBuffer).resize(resizeOptions);
    }

    // Apply format-specific optimizations
    let optimizedImageBuffer: Buffer;

    switch (finalFormat) {
      case 'avif':
        optimizedImageBuffer = await sharpInstance
          .avif({
            quality,
            effort: 4, // Good balance between speed and compression
            chromaSubsampling: '4:2:0' // Better compression for photos
          })
          .toBuffer();
        break;

      case 'webp':
        optimizedImageBuffer = await sharpInstance
          .webp({
            quality,
            effort: 4, // Balanced encoding effort
            nearLossless: quality > 90, // Use near-lossless for high quality
            smartSubsample: true // Better compression
          })
          .toBuffer();
        break;

      case 'jpeg':
        optimizedImageBuffer = await sharpInstance
          .jpeg({
            quality,
            progressive: true, // Progressive JPEG for better perceived loading
            mozjpeg: true // Use mozjpeg encoder for better compression
          })
          .toBuffer();
        break;

      case 'png':
        optimizedImageBuffer = await sharpInstance
          .png({
            quality,
            compressionLevel: 9, // Maximum compression
            adaptiveFiltering: true, // Better compression for photos
            palette: quality < 90 // Use palette for lower quality requirements
          })
          .toBuffer();
        break;

      default:
        // Fallback to WebP
        optimizedImageBuffer = await sharpInstance.webp({ quality }).toBuffer();
    }

    // Save to cache
    const finalCachedImagePath = path.join(CACHE_DIR, cachedImageKey);
    await fs.writeFile(finalCachedImagePath, optimizedImageBuffer);

    // Get metadata from the processed image
    const metadata = await sharp(optimizedImageBuffer).metadata();

    return {
      buffer: optimizedImageBuffer,
      path: finalCachedImagePath,
      metadata: {
        format: metadata.format || finalFormat,
        width: metadata.width || width,
        height: metadata.height || height || 0,
        contentType: `image/${metadata.format || finalFormat}`
      }
    };
  } catch (error) {
    debug(error);
    throw new Error('Image not found or processing failed');
  }
};
