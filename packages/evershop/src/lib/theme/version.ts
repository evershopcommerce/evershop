import semver from 'semver';

/**
 * Theme content version validation (spec 04 § 5.2). A theme `version` must be
 * valid SemVer — it gates install/upgrade ordering (§ 7.1), so a malformed
 * value is rejected up front. Single source of truth for the rule, shared by
 * the manifest validator and the `theme:export-content` CLI.
 */
export function isValidVersion(value: unknown): value is string {
  return typeof value === 'string' && semver.valid(value) !== null;
}

export function assertValidVersion(value: unknown): string {
  if (!isValidVersion(value)) {
    throw new Error(
      `invalid version '${String(value)}' — must be a valid SemVer string ` +
        `(e.g. "1.2.0")`
    );
  }
  return value;
}
