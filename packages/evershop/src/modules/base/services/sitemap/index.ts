/**
 * Public API of the sitemap feature (`@evershop/evershop/base/services/sitemap`).
 *
 * The sitemap lives in the `base` module, so the export path mirrors that. Extensions add their
 * own URLs with `registerSitemapCollector` from a `bootstrap` file; `createEntityCollector` is the shortcut for
 * any entity that has `url_rewrite` rows; `generateSitemap` is exposed for a programmatic
 * "regenerate now".
 */
export * from './types.js';
export { registerSitemapCollector, getSitemapCollectors } from './registry.js';
export { createEntityCollector } from './collectors/entityCollector.js';
export type { EntityCollectorSpec } from './collectors/entityCollector.js';
export { createStaticCollector } from './collectors/staticCollector.js';
export type { StaticCollectorSpec } from './collectors/staticCollector.js';
export { generateSitemap } from './generateSitemap.js';
export type { GenerateOptions, GenerateResult } from './generateSitemap.js';
