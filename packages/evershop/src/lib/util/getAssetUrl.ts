import { getBaseUrl } from './getBaseUrl.js';

/** A URL scheme such as `https:` or `data:` */
const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** Schemes that are never a stored file and must not reach an email or a page */
const UNSAFE_SCHEME = /^(?:javascript|vbscript|file):/i;

/**
 * The absolute URL of a stored file (a product image, an order item
 * thumbnail, a blog post image, the favicon), for places outside the
 * storefront page: emails, feeds, social sharing tags.
 *
 * Local storage stores a site-relative path (`/assets/catalog/…`), so the
 * store's base URL (`getBaseUrl()`) goes in front. Every other storage (S3,
 * Azure Blob, Google Cloud Storage, Cloudinary, a CDN, …) stores the full URL
 * already, so it is returned as it is: prefixing it would give
 * `https://shop.comhttps://bucket…`.
 *
 * A protocol-relative value (`//cdn…`) gets the base URL's scheme, since an
 * email or a crawler has no page to take it from. A `javascript:`,
 * `vbscript:` or `file:` value is not a file URL: it becomes empty, like an
 * empty value.
 *
 * For a resized copy through the store's image endpoint, use `getImageUrl`.
 */
export function getAssetUrl(path: string): string {
  if (!path) {
    return path;
  }
  // Browsers ignore spaces and control characters in a scheme (`java\tscript:`)
  const compact = Array.from(path)
    .filter((char) => char.charCodeAt(0) > 0x20)
    .join('');
  if (UNSAFE_SCHEME.test(compact)) {
    return '';
  }
  if (path.startsWith('//')) {
    return `${SCHEME.exec(getBaseUrl())?.[0] ?? 'https:'}${path}`;
  }
  if (SCHEME.test(path)) {
    return path;
  }
  return `${getBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
}
