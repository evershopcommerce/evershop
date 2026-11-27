/**
 * Checks a `?redirect=` value before the app sends a visitor to it after
 * login, so the parameter cannot become an open redirect (CWE-601).
 *
 * Only a path on this site is accepted. `startsWith('/') && !startsWith('//')`
 * is not enough: browsers read `\` as `/` and drop TAB/LF/CR inside a URL, so
 * `/\evil.com` and `/\t/evil.com` both become `//evil.com`, another site.
 * Such values are refused outright, and the rest is parsed against a fixed
 * origin to make sure it stays on it.
 *
 * Pure, no imports: runs on the server (login page middleware) and in the
 * browser (login form).
 */

const MAX_LENGTH = 2048;
const BASE = 'http://evershop.invalid';

export interface SafeRedirectOptions {
  /**
   * Accept only paths under this prefix, e.g. `/admin`. The prefix itself
   * matches, `/admin/orders` matches, `/administrator` does not.
   */
  prefix?: string;
}

/**
 * Returns the path (with its query and hash) to send the visitor to, or
 * `null` when `value` is not a safe path on this site.
 */
export function getSafeRedirectPath(
  value: unknown,
  options: SafeRedirectOptions = {}
): string | null {
  if (typeof value !== 'string' || value === '' || value.length > MAX_LENGTH) {
    return null;
  }
  // Control characters and backslashes have no place in a path we build
  // ourselves; browsers rewrite them into a protocol-relative URL.
  if (/[\x00-\x1F\x7F\\]/.test(value)) {
    return null;
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) {
    return null;
  }
  // The pathname is normalized here (`/admin/../x` is `/x`), so the prefix
  // check below cannot be walked out of.
  const { prefix } = options;
  if (
    prefix &&
    url.pathname !== prefix &&
    !url.pathname.startsWith(`${prefix}/`)
  ) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
