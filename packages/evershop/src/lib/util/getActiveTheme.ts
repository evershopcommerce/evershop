import { getConfig } from './getConfig.js';

/**
 * The theme ID currently set in `config.system.theme`, or `null` if no
 * custom theme is active. Per `04-theme-scoped-widgets-specification.md`
 * § 9.1.
 *
 * Pure config read — no filesystem checks, no process exits. Safe for the
 * request hot path. Storefront filter, page-builder editor server endpoints,
 * preview path enforcement, and CLI tooling all read from this single
 * source.
 *
 * NOT the same as `getEnabledTheme()` in this directory — that function
 * performs FS existence checks and calls `process.exit(1)` on failure,
 * intended for build/dev startup. `getActiveTheme()` is the cheap read.
 *
 * Returns `null` (not `undefined`) when no theme is set, so callers can
 * use `IS NOT DISTINCT FROM` semantics in DB queries:
 *
 *   const t = getActiveTheme();
 *   pool.query(`SELECT ... WHERE theme IS NOT DISTINCT FROM $1`, [t]);
 */
export function getActiveTheme(): string | null {
  const v = getConfig('system.theme');
  return typeof v === 'string' && v.length > 0 ? v : null;
}
