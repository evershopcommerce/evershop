/**
 * URL scheme allow-list for user/admin-authored links (widget CTAs, menu
 * items, tile links). Blocks the `javascript:` / `data:` / `vbscript:` href
 * XSS vector while letting through the schemes a storefront link legitimately
 * uses.
 *
 * Used on both surfaces:
 *  - server: `resolveLink` neutralizes an unsafe stored value to `null` so it
 *    never reaches an `href` (the security boundary),
 *  - client: the LinkPicker "Custom" tab warns the merchant as they type.
 */

const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/**
 * True when `url` is safe to place in an `href`. Relative paths, anchors and
 * query links are safe; absolute URLs must use an allow-listed scheme.
 *
 * Browsers strip TAB/LF/CR anywhere in a URL and ignore leading control
 * characters before a scheme, so `java\tscript:alert(1)` executes — the check
 * strips control characters before inspecting the scheme to close that hole.
 */
export function isSafeUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  // Strip ASCII control chars (0x00-0x1F, 0x7F) so a smuggled scheme like
  // `java\tscript:` can't slip past the scheme test below.
   
  const stripped = url.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (stripped === '') return true; // empty -> nothing to render, harmless
  // Relative path, anchor or query - no scheme, always safe.
  if (/^(?:[/#?]|\.{1,2}\/)/.test(stripped)) return true;
  const match = stripped.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!match) return true; // no scheme (e.g. "foo/bar") -> relative, safe
  return SAFE_SCHEMES.includes(match[1].toLowerCase());
}
