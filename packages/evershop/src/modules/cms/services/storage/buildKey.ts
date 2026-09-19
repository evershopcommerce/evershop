/**
 * Normalize a file-manager path into an object-storage key: forward slashes
 * only, no leading/trailing slash, no empty segments. Upload, browse and
 * delete all build keys through this single helper so they can never disagree
 * on key format (a leading slash or a Windows backslash reaching only one of
 * them would otherwise create objects the browser can't see or the deleter
 * can't remove).
 */
export function buildKey(requestedPath: string): string {
  return String(requestedPath ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment !== '')
    .join('/');
}

/**
 * Encode a key for use in a URL, preserving `/` as the segment separator.
 * Object keys may contain characters that are not URL-safe (spaces, `&`, `+`,
 * …) — folder names are user input and are not sanitized on creation.
 */
export function encodeKeyForUrl(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
