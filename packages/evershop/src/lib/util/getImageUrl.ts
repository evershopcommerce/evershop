import { getBaseUrl } from './getBaseUrl.js';

export interface ImageUrlOptions {
  /** Width in pixels. The endpoint needs it */
  width: number;
  /**
   * Height in pixels. With it, the image is scaled to fit inside
   * width × height and padded to exactly that size (transparent for png,
   * webp and avif, black for jpeg). Without it, only the width is set
   */
  height?: number;
  /** 1 to 100. The endpoint's default is 75 */
  quality?: number;
  /** The endpoint's default is webp */
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

/**
 * The absolute URL of a resized copy of an image, through the store's image
 * endpoint (`/images?src=…&w=…`), for places outside the storefront page:
 * emails, social sharing tags (`og:image`), feeds.
 *
 * `src` is the stored value, as it is: a site-relative path for local
 * storage (read from disk), or the full URL from any other storage. The
 * endpoint fetches a full URL only from an allowed host: the S3, Google
 * Cloud Storage and Azure hosts of the storage settings are allowed
 * automatically, any other host needs `IMAGE_ALLOWED_HOSTS` or
 * `registerAllowedImageHostsProvider`. Only the endpoint URL is absolute.
 *
 * The parameters go in a fixed order (`src`, `w`, `q`, `h`, `f`), so one image
 * always gets the same URL, which crawlers and HTTP caches key on. An option
 * that is `undefined` or `null` is left out. The path does not depend on the
 * routes, so it works in any process.
 */
export function getImageUrl(src: string, options: ImageUrlOptions): string {
  const { width, height, quality, format } = options;
  const params = [`src=${encodeURIComponent(src)}`, `w=${width}`];
  const optional: Array<[string, unknown]> = [
    ['q', quality],
    ['h', height],
    ['f', format]
  ];
  optional.forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.push(`${key}=${value}`);
    }
  });
  return `${getBaseUrl()}/images?${params.join('&')}`;
}
