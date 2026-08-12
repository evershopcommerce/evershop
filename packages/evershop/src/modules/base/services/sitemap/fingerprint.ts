import { CollectorStat } from './types.js';

/** One collector's contribution to the fingerprint. */
export interface FingerprintEntry {
  name: string;
  stat: CollectorStat;
}

/**
 * Build a deterministic change-fingerprint for the whole sitemap (wiki/sitemap-design.md §4).
 *
 * Folds in each collector's `(count, maxUpdatedAt, pathsHash)` PLUS the enabled-locale set and
 * default locale. `pathsHash` catches URL changes that don't bump `updated_at` (category
 * assign/move/reparent, the async `url_rewrite` rebuild); the locale part catches language
 * changes that alter every URL with no entity change. Entries and locales are sorted so the
 * result is independent of registration/iteration order.
 */
export function buildFingerprint(
  entries: FingerprintEntry[],
  locales: string[],
  defaultLocale: string
): string {
  const localePart = `locales:${[...locales]
    .sort()
    .join(',')}|default:${defaultLocale}`;
  const statPart = [...entries]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (entry) =>
        `${entry.name}:${entry.stat.count}:${entry.stat.maxUpdatedAt ?? ''}:${
          entry.stat.pathsHash ?? ''
        }`
    )
    .join('|');
  return `${localePart}|${statPart}`;
}

/** True when the sitemap must be regenerated (no prior fingerprint, or it moved). */
export function hasChanged(previous: string | null, next: string): boolean {
  return previous !== next;
}
