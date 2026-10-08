/**
 * Turn a human name into a URL slug: `Bánh sinh nhật` → `banh-sinh-nhat`.
 *
 * NFD-normalizes and strips combining marks so Latin diacritics transliterate
 * instead of vanishing, lowercases, turns every run of non-alphanumerics into
 * a single hyphen, and trims hyphens from both ends. The result always matches
 * `^[a-z0-9]+(?:-[a-z0-9]+)*$` — the pattern `landing_page.url_key` requires —
 * or is the empty string when nothing survives (a name written entirely in a
 * non-Latin script, e.g. `黑色星期五`). Callers decide the fallback.
 */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      // Combining diacritical marks left behind by NFD.
      .replace(/[̀-ͯ]/g, '')
      // Vietnamese đ/Đ is a distinct letter with no combining form, so NFD
      // leaves it intact and the alphanumeric filter below would drop it.
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/** `slugify`, falling back to `<prefix>-<first 8 of uuid>` when nothing survives. */
export function slugifyWithFallback(
  value: string,
  uuid: string,
  prefix = 'landing-page'
): string {
  return slugify(value) || `${prefix}-${uuid.replace(/-/g, '').slice(0, 8)}`;
}
