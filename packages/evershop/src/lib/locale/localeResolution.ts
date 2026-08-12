/**
 * Pure locale-resolution helpers (spec §6.1 / §6.9). No DB, no `node:async_hooks`,
 * no config — just string logic, so they are trivially unit-testable and safe to
 * import anywhere. The DB-backed setting helpers and the Express middleware compose
 * these.
 */

/** Trim + lowercase a candidate locale; treat empty / non-string as `undefined`. */
export function normalizeLocale(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

/**
 * The enabled storefront locales: the deduped union of the default locale and the
 * configured list, default first. Empty / invalid / non-array inputs collapse to just
 * `[defaultLocale]` (so a fresh or half-seeded store behaves single-language). The
 * default is always present regardless of how the list arrived (§6.1 D11).
 */
export function mergeEnabledLocales(
  defaultLocale: string,
  list: unknown
): string[] {
  const def = normalizeLocale(defaultLocale) ?? 'en';
  const extra = Array.isArray(list)
    ? list
        .map(normalizeLocale)
        .filter((locale): locale is string => Boolean(locale))
    : [];
  return [...new Set([def, ...extra])];
}

/**
 * Resolve a storefront request's locale from the first path segment. A segment is
 * treated as a locale prefix only when it is a NON-default, enabled locale — so the
 * default locale is always served unprefixed, and unknown segments (real route names)
 * fall through to the default.
 */
export function pickStorefrontLocale(
  firstSegment: string | undefined,
  enabled: string[],
  defaultLocale: string
): { locale: string; isPrefixed: boolean } {
  const segment = normalizeLocale(firstSegment);
  if (segment && segment !== defaultLocale && enabled.includes(segment)) {
    return { locale: segment, isPrefixed: true };
  }
  return { locale: defaultLocale, isPrefixed: false };
}

/**
 * The locale for a storefront API request (spec §6.13 / D4). API routes are RESTful and
 * unprefixed, so the locale arrives in the `X-Locale` header. Honored only when it is one
 * of the enabled locales — so a header can't request a disabled or arbitrary language;
 * anything else falls back to the store default. Pure + unit-testable.
 */
export function pickApiLocale(
  header: unknown,
  enabled: string[],
  defaultLocale: string
): string {
  const requested = normalizeLocale(header);
  if (requested && Array.isArray(enabled) && enabled.includes(requested)) {
    return requested;
  }
  return defaultLocale;
}

/**
 * The path to navigate to when switching the storefront language (spec §7) — strip the
 * current `/<locale>` prefix from `currentPath`, then apply the target's (the default
 * locale is served unprefixed). `currentPath` is a pathname only (no query). Used by the
 * language switcher; pure + isomorphic.
 */
export function switchLocalePath(
  currentPath: string,
  targetLocale: string,
  defaultLocale: string,
  enabled: string[]
): string {
  const segments = currentPath.split('/');
  const first = normalizeLocale(segments[1]);
  // Strip the current locale prefix → canonical path.
  const canonical =
    first && first !== defaultLocale && enabled.includes(first)
      ? `/${segments.slice(2).join('/')}`
      : currentPath;
  const target = normalizeLocale(targetLocale);
  if (!target || target === defaultLocale) {
    return canonical;
  }
  return canonical === '/' ? `/${target}` : `/${target}${canonical}`;
}

/**
 * The `hreflang` alternate links for the current page (spec §6.17). For each enabled
 * locale, an absolute URL to the same page under that locale (prefix swap, shared slugs),
 * plus an `x-default` pointing at the default-locale (unprefixed) URL. `currentUrl` is the
 * request path and MAY carry a query string (`?page=2`) — it is preserved on every
 * alternate so each one stays consistent with the page's own (query-bearing) canonical
 * URL (Google ignores a hreflang cluster whose self-reference differs from the canonical).
 * Returns `[]` for a single-locale store. Pure + isomorphic: `baseUrl` is passed in so
 * this stays config-free and unit-testable.
 */
export function buildHreflangAlternates(
  currentUrl: string,
  defaultLocale: string,
  enabled: string[],
  baseUrl: string
): { hreflang: string; href: string }[] {
  if (!Array.isArray(enabled) || enabled.length < 2) {
    return [];
  }
  const queryAt = currentUrl.search(/[?#]/);
  const path = queryAt === -1 ? currentUrl : currentUrl.slice(0, queryAt);
  const suffix = queryAt === -1 ? '' : currentUrl.slice(queryAt);
  const href = (locale: string): string =>
    `${baseUrl}${switchLocalePath(path, locale, defaultLocale, enabled)}${suffix}`;
  const alternates = enabled.map((locale) => ({
    hreflang: locale,
    href: href(locale)
  }));
  // x-default → the default-locale (unprefixed) URL.
  alternates.push({ hreflang: 'x-default', href: href(defaultLocale) });
  return alternates;
}
