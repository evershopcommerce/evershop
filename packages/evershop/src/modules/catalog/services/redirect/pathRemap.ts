import { CatalogUrn } from '../../../../lib/urn/index.js';

/**
 * Pure, DB-free path algebra shared by the redirect-capture services (product +
 * category) AND — ported to SQL — the url_rewrite rebuild subscribers, so the
 * recorded redirects and the eventual url_rewrite paths are provably identical.
 * Everything here is a pure function of its inputs and is unit-tested in
 * pathRemap.test.ts. See wiki/url-redirects.md.
 */

export interface RedirectSpec {
  fromPath: string;
  toPath: string;
  entityUrn: string;
}

export interface UrlRewriteRow {
  request_path: string;
  entity_uuid: string;
  entity_type: string;
}

/**
 * Join a category's path prefix (or null for an uncategorised/root entity) with an
 * entity's own url_key. `buildEntityPath('/women', 'shoes') === '/women/shoes'`;
 * `buildEntityPath(null, 'shoes') === '/shoes'`.
 */
export function buildEntityPath(prefix: string | null, urlKey: string): string {
  return prefix ? `${prefix}/${urlKey}` : `/${urlKey}`;
}

/**
 * Boundary-anchored, leading-prefix remap. Replaces a LEADING `oldPrefix` — the
 * whole path (exact match) or the segment ending at a `/` — with `newPrefix`;
 * anything else is returned unchanged.
 *
 * This is NOT a substring replace, which is the bug it fixes:
 *  - `remapPath('/shoe-sale', '/shoe', '/sneaker')` === `'/shoe-sale'` (untouched —
 *    a prefix-collision sibling is not swept), and
 *  - `remapPath('/cat/cat-toy', '/cat', '/animal')` === `'/animal/cat-toy'` (only the
 *    leading segment; the repeated `cat` inside `cat-toy` is NOT mangled).
 */
export function remapPath(
  path: string,
  oldPrefix: string,
  newPrefix: string
): string {
  if (path === oldPrefix) {
    return newPrefix;
  }
  if (path.startsWith(`${oldPrefix}/`)) {
    return `${newPrefix}${path.slice(oldPrefix.length)}`;
  }
  return path;
}

/** True when `path` is the prefix itself or genuinely under `prefix/`. */
export function isUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function urnForRow(row: UrlRewriteRow): string {
  return row.entity_type === 'category'
    ? CatalogUrn.category(row.entity_uuid)
    : CatalogUrn.product(row.entity_uuid);
}

/**
 * The whole category-cascade decision as a pure function. Given the category's
 * old→new path and the url_rewrite rows of the subtree (the category itself + every
 * descendant category/product — the caller selects them with a `/`-boundary query),
 * return the redirect specs: each row remapped via `remapPath` (so each target equals
 * what the boundary-safe url_rewrite cascade will write), with no-op (unchanged) rows
 * dropped. Row order is preserved; duplicates are the caller's concern.
 */
export function planSubtreeRedirects(
  oldPrefix: string,
  newPrefix: string,
  rows: UrlRewriteRow[]
): RedirectSpec[] {
  const specs: RedirectSpec[] = [];
  for (const row of rows) {
    const toPath = remapPath(row.request_path, oldPrefix, newPrefix);
    if (toPath !== row.request_path) {
      specs.push({
        fromPath: row.request_path,
        toPath,
        entityUrn: urnForRow(row)
      });
    }
  }
  return specs;
}
