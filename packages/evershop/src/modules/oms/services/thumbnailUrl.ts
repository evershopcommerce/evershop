/**
 * Resolve an order-item thumbnail for use in transactional emails.
 *
 * Local file storage stores thumbnails as site-relative paths
 * (`/assets/catalog/...`), which need the store's base URL prefixed to
 * survive an email client. Remote storage providers (S3, Cloudinary, …)
 * store the full URL already — prefixing those produces a broken
 * double-URL src (`https://store.comhttps://bucket.s3...`).
 */
export function resolveThumbnailUrl(thumbnail: string, baseUrl: string): string {
  return /^https?:\/\//i.test(thumbnail) ? thumbnail : `${baseUrl}${thumbnail}`;
}
