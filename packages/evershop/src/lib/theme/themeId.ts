/**
 * Theme-ID validation (spec 04 § 6.1 step 0).
 *
 * A theme ID is lowercase ASCII — letters, digits, hyphen, underscore — 1–64
 * characters, starting with a letter or digit. This is the single source of
 * truth for the rule: the Version-1.1.0 migration, every CLI verb, and the
 * manifest pipeline all run a value through here.
 */
export const THEME_ID_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function isValidThemeId(value: unknown): value is string {
  return typeof value === 'string' && THEME_ID_REGEX.test(value);
}

export function assertValidThemeId(value: unknown): string {
  if (!isValidThemeId(value)) {
    throw new Error(
      `invalid theme ID '${String(value)}' — must be lowercase ASCII ` +
        `(a–z, 0–9, hyphen, underscore), 1–64 chars, starting with a letter ` +
        `or digit`
    );
  }
  return value;
}
