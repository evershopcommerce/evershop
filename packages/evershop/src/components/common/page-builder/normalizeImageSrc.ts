/**
 * Normalize an image path picked from the file manager.
 *
 * Collapses accidental duplicate slashes in plain paths (`/assets//file.jpg`,
 * emitted by older FileBrowser builds for media-root files) WITHOUT touching
 * absolute (`https://bucket.s3….com/key`) or protocol-relative (`//cdn…/key`)
 * URLs: cloud file storage returns full URLs whose scheme slashes must
 * survive — collapsing them (`https:/…`) makes the storefront image proxy
 * treat the URL as a local path and 404.
 */
export const normalizeImageSrc = (raw: string | null | undefined): string => {
  const value = raw || '';
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) {
    return value;
  }
  return value.replace(/\/{2,}/g, '/');
};
