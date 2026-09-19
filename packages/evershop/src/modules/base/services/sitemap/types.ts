/**
 * Sitemap module — shared types.
 *
 * The generation pipeline is: collectors emit canonical `SitemapEntry` paths →
 * `expandLocales` turns each into one absolute, localized `SitemapUrlRecord` per
 * enabled locale (with hreflang alternates) → the renderer serializes records into
 * XML. See wiki/sitemap-design.md §3.
 */

/** sitemaps.org `<changefreq>` vocabulary. Google ignores this tag, but other engines use it. */
export type SitemapChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

/**
 * A URL as produced by a collector: a CANONICAL, root-relative path (never absolute,
 * never locale-prefixed) — exactly a `url_rewrite.request_path` (e.g. `/women/shoes/awesome-shoes`).
 * The base URL and locale prefixing are applied later, by `expandLocales`.
 */
export interface SitemapEntry {
  path: string;
  /** ISO-8601, from the entity's `updated_at`. Omitted when unknown. */
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  /** 0.0 – 1.0. Google ignores it. */
  priority?: number;
}

/** One `<xhtml:link rel="alternate">` in a localized `<url>`. */
export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

/**
 * A URL ready for rendering: absolute `loc`, and — on multi-locale stores — the full
 * self-referential hreflang alternate set (including `x-default`). Produced by `expandLocales`.
 */
export interface SitemapUrlRecord {
  loc: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
  alternates?: SitemapAlternate[];
}

/**
 * The cheap change signal a collector exposes for the generation fingerprint:
 *  - `count` / `maxUpdatedAt` — detect adds/removes and content edits (the latter drives `<lastmod>`).
 *  - `pathsHash` — a hash of the included URLs themselves, so a URL that changes WITHOUT bumping the
 *    entity's `updated_at` (a category assign/move/reparent, or the async `url_rewrite` rebuild
 *    racing generation) still flips the fingerprint. Omit it to opt out (forces the count/updated_at
 *    signal only). `null` when the collector is empty.
 */
export interface CollectorStat {
  count: number;
  maxUpdatedAt: string | null;
  pathsHash?: string | null;
}

/**
 * A source of sitemap URLs. Core ships collectors for products, categories, CMS pages,
 * landing pages and static routes; extensions register their own via `registerSitemapCollector`.
 * `name` is also the child-file basename (`sitemap-<name>.xml`), so it must be a URL-safe slug.
 */
export interface SitemapCollector {
  name: string;
  collect(): Promise<SitemapEntry[]>;
  /**
   * Optional cheap fingerprint. Omit to force a full regeneration on every run (safe default
   * for third-party collectors that can't cheaply summarise their set).
   */
  getFingerprint?(): Promise<CollectorStat>;
}
