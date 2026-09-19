import { AsyncLocalStorage } from 'node:async_hooks';
import { getStoreLanguageSync } from '../../modules/setting/services/setting.js';
import { applyLocalePrefix } from './activeDictionary.js';

/**
 * Server-only per-request locale context (spec §6.7).
 *
 * Owns the `AsyncLocalStorage` store, so this module is NEVER imported by isomorphic
 * code (`_.ts`, `buildUrl.ts`, `activeDictionary.ts`) — that would pull
 * `node:async_hooks` into the client bundle. `_()` reads the per-render context from
 * `activeDictionary.ts`; only server code (`translate()`, GraphQL resolvers, the
 * render bridge) reads this ALS store.
 *
 * P2 scope: the store + accessors + `localizeUrl`. Consumers are wired in P3+.
 */

export interface LocaleContext {
  /** The locale this request resolves to (storefront prefix locale, or adminLanguage). */
  locale: string;
  /** The default storefront locale (unprefixed). */
  defaultLocale: string;
  /** Enabled/serveable locales for this request. */
  available: string[];
  /** The FULL locale dictionary for `translate()` (the per-page slice is separate). */
  dict: Record<string, string>;
  /** True for admin requests — disables URL prefixing. */
  isAdmin: boolean;
}

const store = new AsyncLocalStorage<LocaleContext>();

/** Run `fn` with `ctx` available to all (sync and async) code it transitively calls. */
export function runWithLocale<T>(ctx: LocaleContext, fn: () => T): T {
  return store.run(ctx, fn);
}

/** The current request's locale context, or `undefined` outside any `runWithLocale` scope. */
export function getLocaleContext(): LocaleContext | undefined {
  return store.getStore();
}

/**
 * The active locale: the locale this request resolved to (storefront URL prefix, the API
 * `X-Locale` header, or `adminLanguage` for admin requests), falling back OFF-REQUEST — a cron
 * job, an event subscriber, or any call before the locale middleware runs — to the store's
 * default language.
 *
 * That fallback is `getStoreLanguageSync()`, i.e. the admin `storeLanguage` setting first and
 * config `shop.language` only as its own fallback. Config alone is not good enough now that the
 * default language is an admin setting: a store that switches language in the admin never
 * touches `config.json`, so `shop.language` is stale for every store that has ever changed it.
 * (This is the DB-aware resolution the P4 note here used to defer.)
 *
 * Synchronous throughout — cache-only, no DB round-trip — so it is safe inside the `Intl`
 * formatters behind `Price.text`, `DateTime.text` and `toPrice`.
 */
export function getActiveLocale(): string {
  return store.getStore()?.locale ?? getStoreLanguageSync();
}

/** The FULL request dictionary, read by `translate()`. Empty object outside any scope. */
export function getRequestDictionary(): Record<string, string> {
  return store.getStore()?.dict ?? {};
}

/**
 * Add the current request's `/<locale>` prefix to an **already-built URL string**
 * (spec §6.18) — e.g. a `url_rewrite` entity path (`Product.url`, `Category.url`) inside
 * a GraphQL resolver. **Server-only**, and specifically for the resolver context: it
 * reads the request **ALS** (set by the P4 middleware), which — unlike `buildUrl`'s iso
 * context — is populated during GraphQL resolution. Admin-guarded via `applyLocalePrefix`,
 * so admin GraphQL responses stay unprefixed; the default locale is never prefixed.
 *
 * NOT for route-based links — for those use `buildUrl(routeId, …)` (it builds the path
 * AND localizes). This function only prefixes a string you already have.
 */
export function localizeUrl(url: string): string {
  return applyLocalePrefix(url, store.getStore());
}
