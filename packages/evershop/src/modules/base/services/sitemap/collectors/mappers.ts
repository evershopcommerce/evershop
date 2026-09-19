import { SitemapChangeFreq, SitemapEntry } from '../types.js';

/**
 * Pure row → `SitemapEntry` mappers shared by the DB-backed collectors. Kept separate from the
 * collectors themselves (which query the pool) so the mapping logic is unit-tested without a DB.
 * All entity collectors JOIN `url_rewrite`, so their rows share this shape (design §3.3).
 */

export interface EntityUrlRow {
  /** `url_rewrite.request_path` — the canonical friendly path. */
  request_path: string;
  /** The entity's `updated_at` (drives `<lastmod>`). */
  updated_at: string | Date | null;
}

export interface MapEntityOptions {
  changefreq?: SitemapChangeFreq;
  priority?: number;
}

/** Map DB rows (entity JOIN url_rewrite) to canonical sitemap entries. Rows without a path are skipped. */
export function mapEntityRows(
  rows: EntityUrlRow[],
  options: MapEntityOptions = {}
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const row of rows) {
    if (typeof row.request_path !== 'string' || row.request_path.length === 0) {
      continue;
    }
    const entry: SitemapEntry = { path: row.request_path };
    const lastmod = toIso(row.updated_at);
    if (lastmod) entry.lastmod = lastmod;
    if (options.changefreq !== undefined) entry.changefreq = options.changefreq;
    if (options.priority !== undefined) entry.priority = options.priority;
    entries.push(entry);
  }
  return entries;
}

/** A configured static path (e.g. the homepage `/`). */
export interface StaticPathSpec {
  path: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
}

/** Map configured static paths to entries. Non-root-relative paths are skipped. */
export function mapStaticPaths(specs: StaticPathSpec[]): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const spec of specs) {
    if (typeof spec.path !== 'string' || !spec.path.startsWith('/')) {
      continue;
    }
    const entry: SitemapEntry = { path: spec.path };
    if (spec.lastmod !== undefined) entry.lastmod = spec.lastmod;
    if (spec.changefreq !== undefined) entry.changefreq = spec.changefreq;
    if (spec.priority !== undefined) entry.priority = spec.priority;
    entries.push(entry);
  }
  return entries;
}

/** Coerce a DB timestamp to an ISO-8601 string, or undefined when absent/invalid. */
function toIso(value: string | Date | null | undefined): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}
