/**
 * @jest-environment node
 */
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import {
  jest,
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach
} from '@jest/globals';

// Setup helper method to check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the 'root' directory as our ROOTPATH for testing
const ROOTPATH = path.join(__dirname, 'root');

// Create the buildpath in the same root directory so that our imageProcessor can find it
const BUILDPATH = path.join(ROOTPATH, 'images');

// Media directory in our test root
const MEDIA_DIR = path.join(ROOTPATH, 'media');

// Define TEMP_DIR to point to media directory as well (ensuring backward compatibility)
const TEMP_DIR = MEDIA_DIR;

// Mock the helpers module before importing imageProcessor
await jest.unstable_mockModule('../../../../../lib/helpers.js', () => ({
  CONSTANTS: {
    ROOTPATH: ROOTPATH,
    BUILDPATH: BUILDPATH,
    MEDIAPATH: path.join(ROOTPATH, 'media'),
    PUBLICPATH: path.join(ROOTPATH, 'public'),
    THEMEPATH: path.join(ROOTPATH, 'themes')
  }
}));

// Import imageProcessor only after mocking helpers
const { imageProcessor } = await import('../../imageProcessor.js');

// Define test images to be created in the test root media directory
const testImages = {
  // These are relative paths from ROOTPATH
  png: 'media/test-image.png',
  jpg: 'media/test-image.jpg',
  svg: 'media/test-image.svg',
  transparentSvg: 'media/transparent-svg.svg'
};

describe('imageProcessor', () => {
  // Set up and tear down test environment
  beforeAll(async () => {
    // Test images have been created using create-test-images.cjs
    // and are committed to the repository, so we don't need to create them here.

    // Just make sure the cache directory exists for processed images
    try {
      await fs.mkdir(path.join(ROOTPATH, 'media/cache'), { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Create the BUILDPATH (images) directory for processed images
    try {
      await fs.mkdir(BUILDPATH, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Also create the dist version of the BUILDPATH
    const BUILDPATH = path.join(ROOTPATH, 'images');
    try {
      await fs.mkdir(BUILDPATH, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterAll(async () => {
    // No cleanup needed as the test images are permanent
  }); // Delete any cached images before each test
  beforeEach(async () => {
    try {
      // Clean media/cache directory
      const cacheDir = path.join(ROOTPATH, 'media', 'cache');
      const files = await fs.readdir(cacheDir);
      for (const file of files) {
        try {
          await fs.unlink(path.join(cacheDir, file));
        } catch (error) {
          // Ignore errors for individual files
        }
      }
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  // Basic functionality tests
  describe('Basic functionality', () => {
    test('Should process a PNG image successfully', async () => {
      const result = await imageProcessor(testImages.png, 200, 80, 'png');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');

      // Check the returned structure
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.path).toContain('.png');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.format).toBe('png');
      expect(result.metadata.contentType).toBe('image/png');

      // Check path properties
      expect(result.path).toContain(ROOTPATH.replace(process.cwd(), ''));
      expect(result.path).toContain('images');

      // Check the image metadata
      expect(result.metadata.width).toBeLessThanOrEqual(200); // Might be less if original is smaller
    });

    test('Should process a JPG image successfully', async () => {
      const result = await imageProcessor(testImages.jpg, 300, 75, 'jpeg');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');

      // Check the returned structure
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.path).toContain('.jpeg');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.format).toBe('jpeg');
      expect(result.metadata.contentType).toBe('image/jpeg');

      // Check path properties
      expect(result.path).toContain(ROOTPATH.replace(process.cwd(), ''));
      expect(result.path).toContain('images');

      // Check the image metadata
      expect(result.metadata.width).toBeLessThanOrEqual(300); // Might be less if original is smaller
    });

    test('Should process an SVG image successfully', async () => {
      const result = await imageProcessor(testImages.svg, 150, 90, 'png');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');

      // Check the returned structure
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.path).toContain('.png'); // SVGs convert to PNG
      expect(result.metadata).toBeDefined();
      expect(result.metadata.format).toBe('png');
      expect(result.metadata.contentType).toBe('image/png');

      // Check path properties
      expect(result.path).toContain(ROOTPATH.replace(process.cwd(), ''));
      expect(result.path).toContain('images');
    });

    test('Should process transparent SVG with special handling', async () => {
      // For SVGs, we should automatically use PNG as output format
      const result = await imageProcessor(
        testImages.transparentSvg,
        200,
        90,
        'jpeg'
      );

      // Check the returned structure
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');
      expect(result.buffer).toBeInstanceOf(Buffer);

      // Ensure we got PNG even though we requested JPEG
      expect(result.path).toContain('.png');
      expect(result.metadata.format).toBe('png');
      expect(result.metadata.contentType).toBe('image/png');

      // Check path properties
      expect(result.path).toContain(ROOTPATH.replace(process.cwd(), ''));
      expect(result.path).toContain('images');
    });
  });
});

// Parameter validation tests
describe('Parameter validation', () => {
  test('Should throw error with missing src parameter', async () => {
    await expect(imageProcessor(null, 200, 80)).rejects.toThrow(
      'Missing or invalid "src", "w", or "h" parameter'
    );
  });

  test('Should throw error with missing width parameter', async () => {
    await expect(imageProcessor(testImages.jpg, null, 80)).rejects.toThrow(
      'Missing or invalid "src", "w", or "h" parameter'
    );
  });

  test('Should throw error with NaN width parameter', async () => {
    await expect(imageProcessor(testImages.jpg, NaN, 80)).rejects.toThrow(
      'Missing or invalid "src", "w", or "h" parameter'
    );
  });

  test('Should throw error with NaN height parameter', async () => {
    await expect(
      imageProcessor(testImages.jpg, 200, 80, 'webp', NaN)
    ).rejects.toThrow('Missing or invalid "src", "w", or "h" parameter');
  });
});

// Path safety validation tests
describe('Path safety validation', () => {
  test('Should throw error with path traversal attempt', async () => {
    await expect(
      imageProcessor('../../../config/config.json', 200, 80)
    ).rejects.toThrow('Invalid characters in image path');
  });

  test('Should throw error with disallowed path', async () => {
    await expect(imageProcessor('config/config.json', 200, 80)).rejects.toThrow(
      /Image source must be from media\/, public\//
    );
  });

  test('Should normalize paths correctly', async () => {
    // Create a file with double slashes to test normalization
    const testPath = 'media//double//slash//test.jpg';
    const normalizedPath = 'media/double/slash/test.jpg';

    // Process should succeed with normalized path
    const result = await imageProcessor(testPath, 12, 12);
    expect(result).toBeTruthy();

    // Clean up
    await fs.unlink(path.join(ROOTPATH, normalizedPath));

    // Try to remove directories (may fail if not empty, which is fine)
    try {
      await fs.rmdir(dirPath);
    } catch (error) {
      // Ignore errors
    }
  });

  // Test for assets path handling with dynamic path resolution
  test('Should locate asset in media directory first', async () => {
    // Create a test image in the media directory
    const mediaTestImagePath = 'media/asset-test.png';
    const mediaFullPath = path.join(ROOTPATH, mediaTestImagePath);

    // Ensure the test image exists in media
    try {
      await fs.access(mediaFullPath);
    } catch {
      // Create a test image if it doesn't exist
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 100, b: 100, alpha: 1 }
        }
      })
        .png()
        .toFile(mediaFullPath);
    }

    // Use the path with leading slash
    const assetsPath = '/assets/asset-test.png';
    const result = await imageProcessor(assetsPath, 75, 80, 'webp');

    expect(result).toBeTruthy();
    expect(result.metadata.width).toBe(75);
    expect(result.metadata.format).toBe('webp');
  });

  // Test fallback to public directory when file doesn't exist in media
  test('Should fallback to public directory when asset not in media', async () => {
    // Create a test image only in the public directory
    const publicTestImagePath = 'public/public-only-asset.png';
    const publicFullPath = path.join(ROOTPATH, publicTestImagePath);

    // Ensure the test image exists in public but not in media
    try {
      // Try to remove from media if it exists
      await fs
        .unlink(path.join(ROOTPATH, 'media/public-only-asset.png'))
        .catch(() => {});

      // Ensure it exists in public
      try {
        await fs.access(publicFullPath);
      } catch {
        // Create a test image if it doesn't exist
        await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 4,
            background: { r: 100, g: 255, b: 100, alpha: 1 }
          }
        })
          .png()
          .toFile(publicFullPath);
      }
    } catch (error) {
      console.error('Test setup failed:', error);
    }

    // Use the assets path format
    const assetsPath = '/assets/public-only-asset.png';
    const result = await imageProcessor(assetsPath, 80, 80, 'webp');

    expect(result).toBeTruthy();
    expect(result.metadata.width).toBe(80);
    expect(result.metadata.format).toBe('webp');
  });

  // Test default behavior when asset not found in any directory
  test('Should default to media path and throw appropriate error when asset not found', async () => {
    // Use a non-existent asset path
    const nonExistentPath = '/assets/non-existent-asset-' + Date.now() + '.png';

    // Should try media path by default and throw the standard error
    await expect(
      imageProcessor(nonExistentPath, 80, 80, 'webp')
    ).rejects.toThrow(/not found/);
  });

  // Test for regular assets path with leading slash handling
  test('Should convert /assets path to public path', async () => {
    // Create a test file in public directory
    const testImagePath = 'public/assets-test.png';
    const fullPath = path.join(ROOTPATH, testImagePath);

    // Ensure the test image exists
    try {
      await fs.access(fullPath);
    } catch {
      // Create a simple test image if it doesn't exist
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 100, g: 255, b: 100, alpha: 1 }
        }
      })
        .png()
        .toFile(fullPath);
    }

    // Use the path with leading slash - this matches the implementation
    const assetsPath = '/assets/assets-test.png';
    const result = await imageProcessor(assetsPath, 80, 80, 'webp');

    expect(result).toBeTruthy();
    expect(result.metadata.width).toBe(80);
    expect(result.metadata.format).toBe('webp');
  });

  // Test for assets path with leading slash handling
  test('Should convert /assets path to public path', async () => {
    // Use the path with leading slash - this matches the implementation
    const assetsPath = '/assets/assets-test.png';
    const result = await imageProcessor(assetsPath, 80, 80, 'webp');

    expect(result).toBeTruthy();
    expect(result.metadata.width).toBe(80);
    expect(result.metadata.format).toBe('webp');
  });
});

// Format handling tests
describe('Format handling', () => {
  test('Should use explicitly requested format', async () => {
    const result = await imageProcessor(testImages.png, 200, 80, 'webp');
    console.log('Result path:', result);
    expect(result.path.endsWith('.webp')).toBeTruthy();

    // Verify the file was created with correct format
    const metadata = await sharp(result.path).metadata();
    expect(metadata.format).toBe('webp');
  });

  test('Should use webp as default format when none specified', async () => {
    const result = await imageProcessor(testImages.png, 200, 80);
    expect(result.path.endsWith('.webp')).toBeTruthy();

    // Verify the file was created with correct format
    const metadata = await sharp(result.path).metadata();
    expect(metadata.format).toBe('webp');
  });

  test('Should handle SVG images with JPEG format correctly', async () => {
    // Request jpeg for an SVG image, should use PNG instead
    const result = await imageProcessor(testImages.svg, 200, 80, 'jpeg');
    expect(result).toBeTruthy();
    expect(result.path.endsWith('.png')).toBeTruthy(); // Should switch to PNG for SVG

    // Verify the file was created with PNG format
    const metadata = await sharp(result.path).metadata();
    expect(metadata.format).toBe('png');
  });
});

// Height and upscale option tests
describe('Height and upscale options', () => {
  test('Should handle both width and height correctly', async () => {
    // Create a test image with specific dimensions for this test
    const testImagePath = path.join(ROOTPATH, 'media/width-height-test.png');
    await sharp({
      create: {
        width: 500,
        height: 400,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 }
      }
    })
      .png()
      .toFile(testImagePath);

    // Process with both width and height
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);
    const result = await imageProcessor(relativeTestPath, 300, 80, 'png', 200);

    // Verify the result
    expect(result).toBeTruthy();
    const metadata = await sharp(result.path).metadata();

    // Width and height should respect the contain fit
    expect(metadata.width).toBe(300);
    expect(metadata.height).toBe(200);

    // Clean up
    await fs.unlink(testImagePath);
  });

  test('Should respect allowUpscale=false by default', async () => {
    // Create a small test image
    const testImagePath = path.join(ROOTPATH, 'media/no-upscale-test.png');
    await sharp({
      create: {
        width: 100,
        height: 80,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 }
      }
    })
      .png()
      .toFile(testImagePath);

    // Try to upscale without allowing it (default behavior)
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);
    const result = await imageProcessor(relativeTestPath, 2000, 80, 'png');

    // Verify the result - image should not be upscaled
    const metadata = await sharp(result.path).metadata();
    expect(metadata.width).toBe(100); // Original width, not upscaled

    // Clean up
    await fs.unlink(testImagePath);
  });

  test('Should allow upscaling when allowUpscale=true', async () => {
    // Create a small test image
    const testImagePath = path.join(ROOTPATH, 'media/upscale-test.png');
    await sharp({
      create: {
        width: 100,
        height: 80,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 }
      }
    })
      .png()
      .toFile(testImagePath);

    // Process with upscale allowed
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);
    const result = await imageProcessor(
      relativeTestPath,
      200,
      80,
      'png',
      undefined,
      true
    );

    // Verify the result - image should be upscaled
    const metadata = await sharp(result.path).metadata();
    expect(metadata.width).toBe(200); // Should be upscaled to requested width

    // Clean up
    await fs.unlink(testImagePath);
  });

  test('Should use contain fit when both width and height are specified', async () => {
    // Create a rectangular test image (wider than tall)
    const testImagePath = path.join(ROOTPATH, 'media/contain-test.png');
    await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 4,
        background: { r: 255, g: 255, b: 0, alpha: 1 }
      }
    })
      .png()
      .toFile(testImagePath);

    // Process with both dimensions specified - should use contain fit
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);
    const result = await imageProcessor(relativeTestPath, 300, 80, 'png', 300);

    // Verify the result
    const metadata = await sharp(result.path).metadata();

    // For a 400x200 image resized to fit in 300x300 with contain:
    // It should be scaled proportionally to fit within the bounds
    expect(metadata.width).toBe(300);
    expect(metadata.height).toBe(300); // We respect the requested height, fill the gap with transparency

    // No cleanup for test image as it's in the permanent media directory
    // await fs.unlink(testImagePath);
  });
});

// Cache key generation tests
describe('Cache key generation', () => {
  // Create a test image to use for all cache key tests
  const testImagePath = path.join(ROOTPATH, 'media/cache-key-test.jpg');

  beforeAll(async () => {
    // Create a test image
    await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 3,
        background: { r: 100, g: 100, b: 100 }
      }
    })
      .jpeg()
      .toFile(testImagePath);
  });

  afterAll(async () => {
    // No cleanup as we're using the permanent media directory
    // try {
    //   await fs.unlink(testImagePath);
    // } catch (error) {
    //   // Ignore if already deleted
    // }
  });

  test('Should generate different cache keys for different dimensions', async () => {
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);

    const result1 = await imageProcessor(relativeTestPath, 200, 80, 'jpeg');
    const result2 = await imageProcessor(relativeTestPath, 300, 80, 'jpeg');

    expect(result1).not.toBe(result2);

    // Verify both files exist
    const existsResult1 = await fileExists(result1.path);
    const existsResult2 = await fileExists(result2.path);
    expect(existsResult1).toBe(true);
    expect(existsResult2).toBe(true);

    // Verify the dimensions are different
    const metadata1 = await sharp(result1.path).metadata();
    const metadata2 = await sharp(result2.path).metadata();
    expect(metadata1.width).toBe(200);
    expect(metadata2.width).toBe(300);
  });

  test('Should generate different cache keys with/without height', async () => {
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);

    const result1 = await imageProcessor(relativeTestPath, 200, 80, 'jpeg');
    const result2 = await imageProcessor(
      relativeTestPath,
      200,
      80,
      'jpeg',
      150
    );

    expect(result1).not.toBe(result2);

    // Extract the filenames to check the cache key format
    const filename1 = path.basename(result1.path);
    const filename2 = path.basename(result2.path);
    expect(filename2).toContain('h');

    // Verify the height parameter was applied
    const metadata2 = await sharp(result2.path).metadata();
    expect(metadata2.height).toBe(150);
  });

  test('Should generate different cache keys with/without allowUpscale', async () => {
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);

    // Create a small test image to verify upscaling behavior
    const smallTestPath = path.join(ROOTPATH, 'media/small-test.jpg');
    await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
      .jpeg()
      .toFile(smallTestPath);

    const smallRelativePath = path.relative(ROOTPATH, smallTestPath);

    // Without upscaling (default)
    const result1 = await imageProcessor(
      smallRelativePath,
      200,
      80,
      'jpeg',
      undefined,
      false
    );
    // With upscaling
    const result2 = await imageProcessor(
      smallRelativePath,
      200,
      80,
      'jpeg',
      undefined,
      true
    );

    expect(result1).not.toBe(result2);

    // Verify the cache keys include upscale flag
    const filename2 = path.basename(result2.path);
    expect(filename2).toContain('up');

    // Verify upscaling was applied
    const metadata1 = await sharp(result1.path).metadata();
    const metadata2 = await sharp(result2.path).metadata();
    expect(metadata1.width).toBe(50); // Not upscaled
    expect(metadata2.width).toBe(200); // Upscaled

    // No cleanup for small test image as it's in the permanent media directory
    // await fs.unlink(smallTestPath);
  });

  test('Should include appropriate parameters in the cache key', async () => {
    const relativeTestPath = path.relative(ROOTPATH, testImagePath);

    const result = await imageProcessor(
      relativeTestPath,
      400,
      90,
      'webp',
      300,
      true
    );

    // Extract the filename to check cache key format
    const filename = path.basename(result.path);
    expect(filename).toContain('w');
    expect(filename).toContain('h');
    expect(filename).toContain('up');
    expect(filename).toContain('q');
    expect(filename).toContain('webp');

    // Verify all parameters were applied
    const metadata = await sharp(result.path).metadata();
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(300);
    expect(metadata.format).toBe('webp');
  });

  test('Should handle external URLs in cache key', async () => {
    // Mock fetch for external URLs
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => sharp(testImagePath).toBuffer()
    });

    const url = 'https://example.com/image.jpg';
    const result = await imageProcessor(url, 200, 85, 'jpeg');
    const encodedSrc = Buffer.from(url).toString('base64url');
    // The URL should be encoded in the result
    expect(result).toBeTruthy();
    expect(result.path).toContain(encodedSrc);

    // Verify the file exists and has correct dimensions
    const fileExistsResult = await fileExists(result.path);
    expect(fileExistsResult).toBe(true);

    // Clean up the global mock
    delete global.fetch;
  });
});

// Error handling tests
describe('Error handling', () => {
  test('Should handle non-existent local file gracefully', async () => {
    await expect(
      imageProcessor('media/nonexistent.jpg', 200, 80)
    ).rejects.toThrow('Image not found');
  });

  test('Should handle external URL fetch errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      imageProcessor('https://example.com/image.jpg', 200, 80)
    ).rejects.toThrow('Image not found or processing failed');

    delete global.fetch;
  });

  test('Should handle unsuccessful HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(
      imageProcessor('https://example.com/image.jpg', 200, 80)
    ).rejects.toThrow('Image not found or processing failed');

    delete global.fetch;
  });

  test('Should handle invalid URL format', async () => {
    // This string is not a valid URL but doesn't contain path traversal
    // Should be processed as a local file (which will fail with not found)
    await expect(imageProcessor('not-a-valid-url', 200, 80)).rejects.toThrow();
  });

  test('Should reject paths outside allowed directories', async () => {
    await expect(
      imageProcessor('node_modules/package/file.jpg', 200, 80)
    ).rejects.toThrow('Image source must be from');
  });

  test('Should handle corrupt image gracefully', async () => {
    // Create a corrupt image file (not a valid image format)
    const corruptFilePath = path.join(ROOTPATH, 'media/corrupt.jpg');
    await fs.writeFile(corruptFilePath, 'This is not an image file');

    const relativeCorruptPath = path.relative(ROOTPATH, corruptFilePath);

    // Should fail to process the corrupt image
    await expect(
      imageProcessor(relativeCorruptPath, 200, 80)
    ).rejects.toThrow();

    // Clean up
    await fs.unlink(corruptFilePath);
  });
});
