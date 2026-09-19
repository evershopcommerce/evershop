/**
 * @jest-environment node
 *
 * Probe test for issue #830: imageProcessor should resolve assets from the
 * ACTIVE theme's public/ directory (and only that theme), without weakening
 * the existing path-traversal / allow-list guards.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOTPATH = path.join(__dirname, 'root');

await jest.unstable_mockModule('../../../../../lib/helpers.js', () => ({
  CONSTANTS: {
    ROOTPATH,
    BUILDPATH: path.join(ROOTPATH, 'images'),
    MEDIAPATH: path.join(ROOTPATH, 'media'),
    PUBLICPATH: path.join(ROOTPATH, 'public'),
    THEMEPATH: path.join(ROOTPATH, 'themes')
  }
}));

await jest.unstable_mockModule('../../../../../lib/util/secureFetch.js', () => ({
  secureFetch: jest.fn(),
  assertAllowedUrl: jest.fn(),
  getAllowedImageHosts: jest.fn(() => [])
}));

// The unit-under-test only needs the active theme's NAME. We mock the cheap,
// hot-path-safe getActiveTheme() helper (returns the theme id string or null).
const getActiveTheme = jest.fn();
await jest.unstable_mockModule(
  '../../../../../lib/util/getActiveTheme.js',
  () => ({ getActiveTheme })
);

const { imageProcessor } = await import('../../imageProcessor.js');

describe('imageProcessor — theme public assets (#830)', () => {
  beforeEach(() => {
    getActiveTheme.mockReset();
  });

  it('resolves /assets/<file> from the ACTIVE theme public dir', async () => {
    getActiveTheme.mockReturnValue('mytheme');
    const result = await imageProcessor('/assets/theme-logo.png', 120, 75, 'webp');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.metadata.contentType).toBe('image/webp');
  });

  it('resolves a direct active-theme path (themes/<active>/public/...)', async () => {
    getActiveTheme.mockReturnValue('mytheme');
    const result = await imageProcessor(
      'themes/mytheme/public/theme-logo.png',
      120,
      75,
      'webp'
    );
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('404s the same /assets/ file when NO theme is active (proves theme path is what resolves it)', async () => {
    getActiveTheme.mockReturnValue(null);
    await expect(
      imageProcessor('/assets/theme-logo.png', 120, 75, 'webp')
    ).rejects.toThrow();
  });

  it('REJECTS a non-active theme directory (allow-list is scoped to the active theme)', async () => {
    getActiveTheme.mockReturnValue('mytheme');
    await expect(
      imageProcessor('themes/othertheme/public/secret.png', 120, 75, 'webp')
    ).rejects.toThrow();
  });

  it('still BLOCKS path traversal even with a theme active', async () => {
    getActiveTheme.mockReturnValue('mytheme');
    await expect(
      imageProcessor('/assets/../../../etc/passwd', 120, 75, 'webp')
    ).rejects.toThrow();
    await expect(
      imageProcessor('themes/mytheme/public/../../../secret.png', 120, 75, 'webp')
    ).rejects.toThrow();
  });
});
