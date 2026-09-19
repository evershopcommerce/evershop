import { addProcessor, getValueSync } from '../../../../lib/util/registry.js';
import { SitemapCollector } from './types.js';

const REGISTRY_KEY = 'sitemapCollectors';

/**
 * Register a source of sitemap URLs. Call from a `bootstrap` file only — the registry locks
 * after bootstrap. Core registers its built-ins here (P5); extensions add their own the same way.
 */
export function registerSitemapCollector(collector: SitemapCollector): void {
  addProcessor<SitemapCollector[]>(REGISTRY_KEY, (list) => [...list, collector]);
}

/** The registered collectors, in registration order. */
export function getSitemapCollectors(): SitemapCollector[] {
  return getValueSync<SitemapCollector[]>(REGISTRY_KEY, [], {});
}
