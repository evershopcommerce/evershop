/**
 * Does a media type satisfy an accept list?
 *
 * Patterns are an exact type (`image/png`), a family wildcard (`image/*`), or
 * `*​/*`. The same shape the `accept` attribute and the upload settings use, so
 * one rule covers the file picker, the grid and the Insert check.
 */
export function matchesAccept(
  mimeType: string | undefined,
  accept?: string[] | null
): boolean {
  if (!accept || accept.length === 0) {
    return true;
  }
  if (!mimeType) {
    // An unknown type is ALLOWED, not rejected. Only a provider written before
    // the listing reported types leaves this empty, and refusing everything it
    // returns would make the browser unusable against it. The server still
    // enforces the real allowlist on upload, which is the check that matters.
    return true;
  }
  const type = mimeType.trim().toLowerCase();
  return accept.some((raw) => {
    const pattern = String(raw).trim().toLowerCase();
    if (pattern === '*' || pattern === '*/*') {
      return true;
    }
    if (pattern.endsWith('/*')) {
      return type.startsWith(pattern.slice(0, -1));
    }
    return type === pattern;
  });
}
