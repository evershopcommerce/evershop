import { describe, it, expect } from '@jest/globals';

const { generateFileName } = await import('../../generateFileName.js');

/**
 * Stored file names: the base name is sanitized to lowercase [a-z0-9-]
 * (URL-safe keys on every storage provider); the extension is whatever
 * `path.extname` returns, kept as-is.
 */
describe('generateFileName', () => {
  it('keeps simple names and their extension', () => {
    expect(generateFileName('photo.jpg')).toBe('photo.jpg');
  });

  it('replaces spaces and special characters with hyphens, lowercases the name', () => {
    expect(generateFileName('My Photo (1).jpg')).toBe('my-photo--1-.jpg');
    expect(generateFileName('cat&dog+#1.png')).toBe('cat-dog--1.png');
  });

  it('replaces non-ASCII characters with hyphens', () => {
    expect(generateFileName('ảnh sản phẩm.png')).toBe('-nh-s-n-ph-m.png');
  });

  it('preserves the extension case while lowercasing the base name', () => {
    expect(generateFileName('IMG_0001.PNG')).toBe('img-0001.PNG');
  });

  it('keeps only the last extension of multi-dot names', () => {
    expect(generateFileName('archive.tar.gz')).toBe('archive-tar.gz');
  });

  it('handles names without an extension', () => {
    expect(generateFileName('README')).toBe('readme');
  });

  it('handles dotfiles (no extension per path.extname)', () => {
    expect(generateFileName('.env')).toBe('-env');
  });
});
