import { describe, expect, it } from '@jest/globals';
import { extensionForMime, isImageMime, mimeFor } from '../../mime.js';

describe('mimeFor', () => {
  it('types the formats a media folder actually holds', () => {
    expect(mimeFor('a.png')).toBe('image/png');
    expect(mimeFor('a.JPG')).toBe('image/jpeg');
    expect(mimeFor('a.webp')).toBe('image/webp');
    expect(mimeFor('doc.pdf')).toBe('application/pdf');
    expect(mimeFor('sheet.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(mimeFor('bundle.zip')).toBe('application/zip');
  });

  it('falls back rather than guessing', () => {
    expect(mimeFor('README')).toBe('application/octet-stream');
    expect(mimeFor('archive.unknownext')).toBe('application/octet-stream');
    // A leading dot is the whole name, not an extension.
    expect(mimeFor('.gitignore')).toBe('application/octet-stream');
  });

  it('uses the LAST extension of a multi-dotted name', () => {
    expect(mimeFor('photo.backup.png')).toBe('image/png');
    expect(mimeFor('archive.tar.gz')).toBe('application/gzip');
  });

  it('separates what can be previewed from what cannot', () => {
    // This is what stops the browser pointing an <img> at a PDF.
    expect(isImageMime(mimeFor('a.png'))).toBe(true);
    expect(isImageMime(mimeFor('a.svg'))).toBe(true);
    expect(isImageMime(mimeFor('doc.pdf'))).toBe(false);
    expect(isImageMime(mimeFor('clip.mp4'))).toBe(false);
    expect(isImageMime(undefined)).toBe(false);
  });
});

describe('extensionForMime', () => {
  it('reverses the table, preferring the canonical spelling', () => {
    expect(extensionForMime('image/jpeg')).toBe('.jpg');
    expect(extensionForMime('image/png')).toBe('.png');
    expect(extensionForMime('image/webp')).toBe('.webp');
    expect(extensionForMime('application/pdf')).toBe('.pdf');
  });

  it('round-trips with mimeFor', () => {
    // The pair is used to name a pasted file, which arrives with a type but
    // no usable name.
    for (const type of ['image/png', 'image/gif', 'video/mp4']) {
      expect(mimeFor(`x${extensionForMime(type)}`)).toBe(type);
    }
  });

  it('returns empty for an unknown or absent type', () => {
    expect(extensionForMime('application/x-nonsense')).toBe('');
    expect(extensionForMime(undefined)).toBe('');
  });
});

describe('extension parsing (no Node builtins)', () => {
  it('ignores a dot in a directory name', () => {
    // `path.posix.extname` semantics, reimplemented because this module is
    // bundled for the admin where `path` cannot be resolved.
    expect(mimeFor('catalog.v2/photo')).toBe('application/octet-stream');
    expect(mimeFor('catalog.v2/photo.png')).toBe('image/png');
  });

  it('treats a dotfile as having no extension', () => {
    expect(mimeFor('.gitignore')).toBe('application/octet-stream');
    expect(mimeFor('dir/.env')).toBe('application/octet-stream');
  });

  it('takes the last extension and lowercases it', () => {
    expect(mimeFor('a/b/archive.TAR.GZ')).toBe('application/gzip');
  });
});
