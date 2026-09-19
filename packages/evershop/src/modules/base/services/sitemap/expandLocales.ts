import { applyLocalePrefix } from '../../../../lib/locale/activeDictionary.js';
import { SitemapAlternate, SitemapEntry, SitemapUrlRecord } from './types.js';

export interface ExpandLocalesOptions {
  /** Enabled storefront locales, default first (from `getEnabledLanguages()`). */
  locales: string[];
  /** The default/unprefixed locale (from `getStoreLanguage()`). */
  defaultLocale: string;
  /** Absolute origin, no trailing slash (from `getBaseUrl()`). */
  baseUrl: string;
  /** Emit `<xhtml:link>` alternates on multi-locale stores. Default true. */
  hreflang?: boolean;
}

/**
 * Fan each canonical `SitemapEntry` out into one absolute, localized `SitemapUrlRecord` per
 * enabled locale (wiki/sitemap-design.md §3.4).
 *
 * EverShop serves every enabled locale on a shared slug via URL prefix — the default locale
 * unprefixed (`/shoes`), each non-default enabled locale prefixed (`/de/shoes`). Localization
 * REUSES the storefront's own `applyLocalePrefix`, so sitemap URLs can't drift from what the
 * router serves. On multi-locale stores (and unless `hreflang` is false) every record carries
 * the full self-referential hreflang set — one entry per enabled locale INCLUDING ITSELF, plus
 * `x-default` → the default-locale URL — which makes the reciprocity Google requires hold by
 * construction. Single-language stores emit one record per entry with no alternates.
 */
export function expandLocales(
  entries: SitemapEntry[],
  options: ExpandLocalesOptions
): SitemapUrlRecord[] {
  const { defaultLocale, baseUrl } = options;
  const locales = options.locales.length > 0 ? options.locales : [defaultLocale];
  const withHreflang = options.hreflang !== false && locales.length > 1;

  const records: SitemapUrlRecord[] = [];
  for (const entry of entries) {
    // The alternate set is identical for every locale variant of this entry, so compute once.
    const alternates = withHreflang
      ? buildAlternates(entry.path, locales, defaultLocale, baseUrl)
      : undefined;

    for (const locale of locales) {
      const record: SitemapUrlRecord = {
        loc: toAbsolute(entry.path, locale, defaultLocale, baseUrl)
      };
      if (entry.lastmod !== undefined) record.lastmod = entry.lastmod;
      if (entry.changefreq !== undefined) record.changefreq = entry.changefreq;
      if (entry.priority !== undefined) record.priority = entry.priority;
      if (alternates) record.alternates = alternates;
      records.push(record);
    }
  }
  return records;
}

function buildAlternates(
  path: string,
  locales: string[],
  defaultLocale: string,
  baseUrl: string
): SitemapAlternate[] {
  const alternates = locales.map((locale) => ({
    hreflang: toHreflang(locale),
    href: toAbsolute(path, locale, defaultLocale, baseUrl)
  }));
  alternates.push({
    hreflang: 'x-default',
    href: toAbsolute(path, defaultLocale, defaultLocale, baseUrl)
  });
  return alternates;
}

/** Build the absolute, locale-localized URL for a canonical path. Already-absolute paths pass through. */
function toAbsolute(
  path: string,
  locale: string,
  defaultLocale: string,
  baseUrl: string
): string {
  if (isAbsolute(path)) {
    return path;
  }
  const localized = applyLocalePrefix(path, {
    locale,
    defaultLocale,
    isAdmin: false
  });
  return `${baseUrl}${localized}`;
}

function isAbsolute(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

/** hreflang wants BCP-47 (hyphen); EverShop locale codes are already lowercased. */
function toHreflang(locale: string): string {
  return locale.replace(/_/g, '-');
}
