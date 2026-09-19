/**
 * Isomorphic locale accessor (spec §6.4 / §6.7).
 *
 * Read by `_()` (the active dictionary) and `buildUrl` (the locale context), on BOTH
 * server and client — so this module is bundled to the browser and MUST stay free of
 * server-only imports (no Node async-context store). It has no imports at all.
 *
 * - Server: the per-render context is set by `setSSRContext` immediately before the
 *   synchronous `renderToString` and reset after (safe because SSR is synchronous).
 * - Client: read once from `window.eContext` and memoized.
 *
 * The server-only request-scoped store lives in `localeContext.ts`; `applyLocalePrefix`
 * lives HERE (pure, isomorphic) so the isomorphic `buildUrl` can reuse it without
 * dragging the server-only async-context store into the client bundle.
 */

export interface IsoLocaleContext {
  locale: string;
  defaultLocale: string;
  isAdmin: boolean;
}

const EMPTY_CONTEXT: IsoLocaleContext = {
  locale: '',
  defaultLocale: '',
  isAdmin: false
};

let ssr: { ctx: IsoLocaleContext; dict: Record<string, string> } | null = null;
let client: { ctx: IsoLocaleContext; dict: Record<string, string> } | null = null;

/**
 * Server-only: set the per-render locale context + dictionary immediately before the
 * synchronous `renderToString`, and reset after. No-op-safe to call with empties.
 */
export function setSSRContext(
  ctx: IsoLocaleContext,
  dict: Record<string, string>
): void {
  ssr = { ctx, dict };
}

function read(): { ctx: IsoLocaleContext; dict: Record<string, string> } {
  if (typeof window === 'undefined') {
    return ssr ?? { ctx: EMPTY_CONTEXT, dict: {} };
  }
  if (!client) {
    const eContext = window.eContext ?? {};
    client = {
      ctx: {
        locale: eContext.locale ?? '',
        defaultLocale: eContext.defaultLocale ?? '',
        isAdmin: Boolean(eContext?.config?.pageMeta?.route?.isAdmin)
      },
      dict: eContext.translations ?? {}
    };
  }
  return client;
}

/** The dictionary `_()` reads: the page slice on the server (per-render) / the page's dict on the client. */
export function getActiveDictionary(): Record<string, string> {
  return read().dict;
}

/** The locale context `buildUrl` reads, isomorphically. */
export function getLocaleContextIso(): IsoLocaleContext {
  return read().ctx;
}

/**
 * Shared, pure prefix logic (spec §6.10 / §6.18) — used by `buildUrl` (isomorphic) and
 * by `localizeUrl` (server, in `localeContext.ts`). Prepends `/<locale>` only when the
 * target route is not admin, the current context is not admin, and the locale is not
 * the default. Lives in this isomorphic module on purpose (stays client-safe).
 */
export function applyLocalePrefix(
  url: string,
  ctx: IsoLocaleContext | undefined,
  targetIsAdmin = false
): string {
  if (!ctx || targetIsAdmin || ctx.isAdmin || ctx.locale === ctx.defaultLocale) {
    return url;
  }
  // Never prefix a RESTful API path (D4: `/api/*` stays unprefixed). Guards the case where
  // a localized resolver — e.g. `localizeUrl(buildUrl('someApiRoute'))` — produces an
  // `/api/...` path; page routes alone should get the `/<locale>` prefix.
  const path = url.split(/[?#]/)[0];
  if (path === '/api' || path.startsWith('/api/')) {
    return url;
  }
  // Root: `/${locale}/` would be a trailing-slash variant of the canonical `/${locale}`
  // (the home path the switcher and route matcher use) — normalize so they don't split.
  if (url === '/') {
    return `/${ctx.locale}`;
  }
  return `/${ctx.locale}${url}`;
}
