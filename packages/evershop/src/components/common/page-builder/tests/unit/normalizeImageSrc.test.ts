import { describe, it, expect } from '@jest/globals';
import { normalizeImageSrc } from '../../normalizeImageSrc.js';

describe('normalizeImageSrc (file-manager pick normalization)', () => {
  it('collapses duplicate slashes in local media paths', () => {
    expect(normalizeImageSrc('/assets//file.jpg')).toBe('/assets/file.jpg');
    expect(normalizeImageSrc('/assets///a//b.png')).toBe('/assets/a/b.png');
  });

  it('keeps a normal local path untouched', () => {
    expect(normalizeImageSrc('/assets/catalog/1/img.jpg')).toBe(
      '/assets/catalog/1/img.jpg'
    );
  });

  it('never touches absolute URLs (cloud storage returns these)', () => {
    const s3 =
      'https://my-bucket.s3.ap-southeast-2.amazonaws.com/catalog/img.jpg';
    expect(normalizeImageSrc(s3)).toBe(s3);
    const gcs = 'https://storage.googleapis.com/my-bucket/img.jpg';
    expect(normalizeImageSrc(gcs)).toBe(gcs);
    const azure = 'https://acct.blob.core.windows.net/media/img.jpg';
    expect(normalizeImageSrc(azure)).toBe(azure);
    expect(normalizeImageSrc('http://localhost:9000/bucket/img.jpg')).toBe(
      'http://localhost:9000/bucket/img.jpg'
    );
  });

  it('never touches protocol-relative URLs', () => {
    expect(normalizeImageSrc('//cdn.example.com/img.jpg')).toBe(
      '//cdn.example.com/img.jpg'
    );
  });

  it('preserves consecutive slashes inside an absolute URL path (valid S3 keys)', () => {
    const doubled = 'https://bucket.s3.amazonaws.com/folder//img.jpg';
    expect(normalizeImageSrc(doubled)).toBe(doubled);
  });

  it('returns an empty string for null/undefined/empty input', () => {
    expect(normalizeImageSrc('')).toBe('');
    expect(normalizeImageSrc(null)).toBe('');
    expect(normalizeImageSrc(undefined)).toBe('');
  });
});
