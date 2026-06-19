import { canonicalize } from './canonicalize.js';
import type { Manifest } from './manifest.js';

/**
 * Fingerprint a manifest's CONTENT only — `widgets[]` + `placements[]`.
 *
 * Excludes metadata (`theme_name`, `version`, and any future
 * description/author/license fields). Used by the upgrade path to tell whether
 * a strictly-higher `version` actually changed any content (vs. a version-only
 * bump), and to warn when content drifts at an unchanged version (§ 7.1).
 *
 * Array order IS significant (canonicalize doesn't sort arrays), so reordering
 * `widgets[]` changes the fingerprint — intentional, since order can matter.
 */
export function contentFingerprint(manifest: Manifest): string {
  return canonicalize({
    widgets: manifest.widgets,
    placements: manifest.placements
  });
}
