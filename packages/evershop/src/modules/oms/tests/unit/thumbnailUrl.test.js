import { resolveThumbnailUrl } from '../../services/thumbnailUrl.js';

/**
 * Regression for the double-URL thumbnail in the order-confirmation email.
 * The subscriber prefixed the base URL onto EVERY thumbnail; with a remote
 * storage provider (S3, Cloudinary, …) the stored value is already an
 * absolute URL, so the email rendered
 * `https://store.example.comhttps://bucket.s3.../thermos-black.jpg` — a 404
 * in every inbox. Relative paths (local storage) still need the prefix.
 */
describe('resolveThumbnailUrl', () => {
  const BASE = 'https://lucky-summit-4901.myevershop.io';

  it('prefixes the base URL onto relative local-storage paths', () => {
    expect(resolveThumbnailUrl('/assets/catalog/9424/1250/thermos.jpg', BASE)).toBe(
      'https://lucky-summit-4901.myevershop.io/assets/catalog/9424/1250/thermos.jpg'
    );
  });

  it('passes absolute URLs through untouched (remote storage providers)', () => {
    const s3 =
      'https://evershop-stage0-site-54da42ce.s3.ap-southeast-1.amazonaws.com/catalog/9424/1250/thermos-black.jpg';
    expect(resolveThumbnailUrl(s3, BASE)).toBe(s3);
  });

  it('treats scheme matching as case-insensitive and covers plain http', () => {
    expect(resolveThumbnailUrl('HTTP://cdn.example.com/x.jpg', BASE)).toBe(
      'HTTP://cdn.example.com/x.jpg'
    );
    expect(resolveThumbnailUrl('http://cdn.example.com/x.jpg', BASE)).toBe(
      'http://cdn.example.com/x.jpg'
    );
  });
});
