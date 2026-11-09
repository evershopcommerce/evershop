/**
 * IMG-06: true when `url` points into this store's own file storage, so the
 * image is kept as it is and not copied onto itself. It compares the parsed
 * scheme, host, port and the path, on whole path segments, with each storage
 * address in `bases`; a string prefix of the raw text would accept
 * `https://shop.example.com.evil.test/` and `/assets/../admin`.
 */
export function isOwnStorageUrl(
  url: string,
  bases: readonly string[]
): boolean {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  if (
    (target.protocol !== 'http:' && target.protocol !== 'https:') ||
    target.username ||
    target.password
  ) {
    return false;
  }
  return bases.some((raw) => {
    let base: URL;
    try {
      base = new URL(raw);
    } catch {
      return false;
    }
    const prefix = base.pathname.endsWith('/')
      ? base.pathname
      : `${base.pathname}/`;
    return (
      target.protocol === base.protocol &&
      target.hostname === base.hostname &&
      target.port === base.port &&
      (target.pathname === base.pathname || target.pathname.startsWith(prefix))
    );
  });
}
